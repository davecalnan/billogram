# Billogram API Client

A universal (runs in node and in browser) promise-based client for [Billogram](https://billogram)'s [API](https://billogram.com/api).

*Example usage:*
```js
import Billogram from 'billgoram-api-client'

const client = new Billogram({
  username: API_USER,
  password: API_PASSWORD
})

/* inside async function */
const billogram = await client.billograms.find(id)
```

## How to use
[Create an API user]((https://billogram.com/documentation#authentication)) within the Billogram UI.

Import the package and create a client with your user credentials:
```js
import Billogram from 'billgoram-api-client'

const client = new Billogram({
  username: 'your-api-user',
  password: 'your-api-password',
})
```

All methods are namespaced under the objects they relate to: `billograms`, `customers`, and `items`.

All methods return the resource they are acting upon, with the exception of `client.billograms.pdf()`.

### Examples

So for example if you want to find a customer by their customer number you would use:
```js
const customer = await client.customers.find(1)
```

If you wanted to create an item you would use:
```js
const item = await client.items.create({ ...itemData })
```

### Promise-based

Each method returns a promise so you can use either [then/catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#Chaining) or [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function#Examples).

```js
client.billograms
  .remind(billogramId, {
    method: 'Email',
    message: 'Please pay me.'
  })
  .then(data => console.log('Reminder sent:', data))
  .catch(error => console.error('Could not send reminder:', error))

/* or */

async function sendReminder(billogramId) {
  const billogram = await client.billograms.remind(billogramId, {
    method: 'Email',
    message: 'Please pay me.'
  })
}
```

### If you want to use a sandbox account
Pass a config object as the second argument to the `Billogram` constructor with `sandbox: true`.

```js
const client = new Billogram({
  username: 'sandbox-api-user',
  password: 'sandbox-api-password',
}, {
  sandbox: true
})
```

## Available methods

### Billograms
These methods map all api endpoints listed at:
- [Billogram Requests](https://billogram.com/documentation#billogram_call_create)
- [Billogram Commands](https://billogram.com/documentation#billogram_call_send)
- [Billogram Invoice PDF](https://billogram.com/documentation#billogram_invoice_pdf)

```js
client.billograms.create(data)
client.billograms.list(params)
client.billograms.find(id)
client.billograms.update(id, data)
client.billograms.send(id, data)
client.billograms.sell(id)
client.billograms.resend(id, data)
client.billograms.remind(id, data)
client.billograms.collect(id)
client.billograms.payment(id, data)
client.billograms.credit(id, data)
client.billograms.writeoff(id)
client.billograms.writedown(id)
client.billograms.revertWritedown(id)
client.billograms.respite(id, data)
client.billograms.removeRespite(id)
client.billograms.message(id, data)
client.billograms.attach(id, data)
client.billograms.pdf(id, params)
```

### Customers
These methods map to the Customer endpoints listed here:
- [Create customer](https://billogram.com/documentation#customers_calls)
- [Fetch customer](https://billogram.com/documentation#customers_fetch)
- [List/search customers](https://billogram.com/documentation#customers_list)
- [Update customer](https://billogram.com/documentation#customers_edit)


```js
client.customers.create(data)
client.customers.list(params)
client.customers.find(customerNumber)
client.customers.update(customerNumber, data)
```

### Items
These methods map to the Item endpoints listed here:
- [Create item](https://billogram.com/documentation#items_calls)
- [Fetch item](https://billogram.com/documentation#items_fetch)
- [List/search items](https://billogram.com/documentation#items_list)
- [Update item](https://billogram.com/documentation#items_edit)
- [Delete item](https://billogram.com/documentation#items_delete)

```js
client.items.create(data)
client.items.list(params)
client.items.find(itemNumber)
client.items.update(itemNumber, data)
client.items.delete(itemNumber)
```

## Tests

[Register](https://sandbox.billogram.com/register) or [login](https://sandbox.billogram.com/login) to the Sandbox.

Create a .env file in the root directory with your sandbox user credientials with the following keys:
```env
TEST_API_USER=your-api-user
TEST_API_PASSWORD=your-api-password
TEST_API_EMAIL=your@email.com (optional)
```

You can optionally add your email to get the customer emails.

If you haven't already install packages `npm run install` and run:

```sh
npm run test
```