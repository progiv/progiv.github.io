// Define exchange rates
date = null
exchangeRates = null;
const chosenCurrencies = ['USD', 'EUR', 'GBP', 'RUB'];

// Function to update currency values
async function updateCurrencyValues(baseCurrency) {
  const inputValue = parseFloat(document.getElementById(baseCurrency).value);

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
        exchangeRates[code] = rate;
      }

      exchangeRates['RUB'] = 1.0;  // for cbrf source

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

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

async function initForm() {
  // Initial setup
  // updateCurrencyValues('USD');
  await updateRates();
  console.info(exchangeRates);

  converterForm = document.getElementById('currencyConverterForm');
  removeAllChildren(converterForm);

  for (const index in chosenCurrencies) {
    const currency = chosenCurrencies[index];
    div = document.createElement('div');

    label = document.createElement('label');
    label.htmlFor = currency
    div.appendChild(label);

    select = document.createElement('select');
    select.className = 'currency-select';
    for (option_currency in exchangeRates) {
      select_option = document.createElement('option')
      select_option.value = option_currency;
      select_option.textContent = option_currency;
      select.appendChild(select_option);
    }
    select.value = currency;
    div.appendChild(select);

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
      updateCurrencyValues(this.id)
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
    });
  })
}

initForm();