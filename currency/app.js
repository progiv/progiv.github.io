// Define exchange rates
date = null
exchangeRates = null;
inputState = null;
const dummyState = {
  chosenCurrencies: ['USD', 'EUR', 'GBP', 'RUB'],
  lastInput: {
    currency: 'USD',
    value: 10.0
  }
};

// Function to update currency values
async function updateCurrencyValues() {
  saveState();
  const inputValue = inputState.lastInput.value;
  const baseCurrency = inputState.lastInput.currency;

  if (!exchangeRates) {
    await updateRates();
  }

  for (input of document.getElementsByClassName('currency-input')) {
    const currency = input.id;
    if (currency !== baseCurrency) {
      const convertedValue = (isNaN(inputValue) ? 0 : inputValue) *
        exchangeRates[baseCurrency] / exchangeRates[currency];
      input.value = convertedValue.toFixed(2);
    }
  }
}

// Function to fetch exchange rates from the provided URL
async function fetchExchangeRatesCBRF() {
  try {
    const response =
      await fetch('https://cbrf-day.progiv-cloudflare.workers.dev/');
    const text = await response.text();

    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // Extract exchange rates
    const exchangeRates = {};
    const valCurs = xmlDoc.getElementsByTagName('ValCurs')[0];

    if (valCurs) {
      const date = valCurs.getAttribute('Date');
      const currencies = valCurs.getElementsByTagName('Valute');

      for (let i = 0; i < currencies.length; i++) {
        const currency = currencies[i];
        const code = currency.getElementsByTagName('CharCode')[0].textContent;
        const rate = parseFloat(
          currency.getElementsByTagName('Value')[0].textContent.replace(
            ',', '.'));
        const nominal = parseInt(currency.getElementsByTagName('Nominal')[0].textContent)
        exchangeRates[code] = rate / nominal;
      }

      exchangeRates['RUB'] = 1.0; // for cbrf source

      console.info(`Exchange rates fetched for ${date}`);
      return [date, exchangeRates];
    } else {
      console.error('Invalid XML format: missing ValCurs element');
      return null;
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

async function updateRates() {
  [date, exchangeRates] = await fetchExchangeRatesCBRF()
}

async function loadInput() {
  try {
    return JSON.parse(localStorage.getItem("inputState")) || dummyState;
  } catch (error) {
    return dummyState;
  }
}

function saveState() {
  localStorage.setItem("inputState", JSON.stringify(inputState));
}

function addSelectOption(select, value) {
  select_option = document.createElement('option')
  select_option.value = value;
  select_option.textContent = value;
  select.appendChild(select_option);
  return select_option;
}

function addCurrencySelect(parent, value) {
  select = document.createElement('select');
  select.className = 'currency-select';
  for (option_currency in exchangeRates) {
    addSelectOption(select, option_currency);
  }
  addSelectOption(select, '--');
  select.value = value;
  parent.appendChild(select);
  return select;
}

async function drawForm() {
  document.getElementById('ratesDate').textContent = `rates for: ${date}`;

  inputState = await loadInput();

  converterForm = document.getElementById('currencyConverterForm');
  converterForm.textContent = '';

  for (const currency of inputState.chosenCurrencies) {
    div = document.createElement('div');

    label = document.createElement('label');
    label.htmlFor = currency
    div.appendChild(label);

    addCurrencySelect(div, currency);

    input = document.createElement('input');
    input.type = 'number';
    input.id = currency;
    input.className = 'currency-input';
    div.appendChild(input);

    converterForm.appendChild(div);
  }

  // Add event listeners to update values on input change
  document.querySelectorAll('.currency-input').forEach(input => {
    input.addEventListener('input', function() {
      inputState.lastInput.currency = this.id;
      inputState.lastInput.value = parseFloat(this.value);
      updateCurrencyValues()
    });
  });

  document.querySelectorAll('.currency-select').forEach(select => {
    select.addEventListener('change', function() {
      for (item of this.parentElement.getElementsByTagName('input')) {
        item.id = this.value
      }
      for (item of this.parentElement.getElementsByTagName('label')) {
        item.htmlFor = this.value
      }

      if (this.value == '--') {
        inputState.chosenCurrencies = [...converterForm.getElementsByTagName('input')].map((element) => element.id).filter((currency) => currency != '--');
        saveState()
        drawForm();
        return;
      }

      inputState.chosenCurrencies = [...converterForm.getElementsByTagName('input')].map((element) => element.id);
      updateCurrencyValues()
    });
  })

  div = document.createElement('div');
  select = addCurrencySelect(div, '--');
  converterForm.appendChild(div);

  select.addEventListener('change', function() {
    if (!inputState.chosenCurrencies.includes(this.value) && this.value != '--') {
      inputState.chosenCurrencies.push(this.value);
      saveState();
      drawForm();
    }
  })

  if (element = document.getElementById(inputState.lastInput.currency)) {
    element.value = inputState.lastInput.value;
  }
  await updateCurrencyValues();
}

async function initForm() {
  await updateRates();
  console.info(exchangeRates);

  await drawForm();
}

initForm();
