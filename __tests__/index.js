import '@babel/polyfill'
import fs from 'fs'
import { promisify } from 'util'
import defaults from 'lodash.defaults'
import dotenv from 'dotenv'
import Billogram from '../dist/main'
// import Billogram from '../src'

const readFile = promisify(fs.readFile)

jest.setTimeout(60000)

dotenv.config()

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const today = new Date()
const daysFromNow = days => new Date(new Date().setDate(new Date().getDate() + days))
const daysAgo = days => daysFromNow(-days)

const isoDate = date => (
    date instanceof Date
      ? date.toISOString()
      : date
  ).match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)[0]

const samples = {
  billogram: (customer_no, item_no) => ({
    customer: {
      customer_no
    },
    items: [
      {
        item_no,
        count: 2
      }
    ]
  }),
  customer: {
    name: 'Jonsson, Inc',
    company_type: 'business',
    org_no: '',
    contact: {
      name: 'Peter Jonsson',
      email: process.env.TEST_EMAIL || 'jonsson@example.com'
    },
    address: {
      street_address: 'Lavendelväg 27',
      zipcode: '12345',
      city: 'Stadby',
      country: 'SE'
    }
  },
  filter: {
    filter_type: 'field',
    filter_field: 'company_type',
    filter_value: 'individual'
  },
  item: {
    title: 'Apartment cleaning',
    description: 'Vacuum cleaning floor, dusting shelves and taking out trash',
    price: 130,
    vat: 25,
    unit: 'hour',
    bookkeeping: {
      income_account: '302',
      vat_account: '303'
    }
  },
  order: {
    order_field: 'customer_no',
    order_direction: 'desc'
  },
}

expect.extend({
  toContainObject(received, argument) {

    const pass = this.equals(received,
      expect.arrayContaining([
        expect.objectContaining(argument)
      ])
    )

    if (pass) {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} not to contain object ${this.utils.printExpected(argument)}`),
        pass: true
      }
    } else {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} to contain object ${this.utils.printExpected(argument)}`),
        pass: false
      }
    }
  }
})

let client

beforeAll(() => {
  client = new Billogram({
    username: process.env.TEST_API_USER,
    password: process.env.TEST_API_PASSWORD
  }, {
    sandbox: process.env !== 'production'
  })
})

describe('billograms', () => {
  test('can be created', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])

    const { status, data } = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
  })

  test('can be listed', async () => {
    const { status, data } = await client.billograms.list()

    expect(status).toBe('OK')
    expect(data).toBeInstanceOf(Array)
  })

  test('can be found', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    const { status, data } = await client.billograms.find(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
  })

  test('can be updated', async () => {
    const [customer, item, otherCustomer] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item),
      client.customers.create(defaults({ name: 'Johnson, Inc' }, samples.customer))
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    expect(billogram.data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))

    const { status, data } = await client.billograms.update(billogram.data.id, {
      customer: {
        customer_no: otherCustomer.data.customer_no
      }
    })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(otherCustomer.data.customer_no, item.data.item_no))
  })

  test('can be sent', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    const { status, data } = await client.billograms.send(billogram.data.id, { method: 'Email' })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'BillogramSent'
    })
  })

  test('can be sold', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    const { status, data } = await client.billograms.sell(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'FactoringRequest'
    })
  })

  test('can be resent', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.resend(billogram.data.id, { method: 'Email' })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'Resent'
    })
  })

  test('can have a reminder sent', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(defaults(
      samples.billogram(customer.data.customer_no, item.data.item_no),
      {
        invoice_date: daysAgo(2).toISOString(),
        due_days: 1
      }
    ))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.remind(billogram.data.id, {
      method: 'Email',
      message: `You'd better pay. Or else.`
    })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'ReminderSent'
    })
  })

  test('can be sent to a collector', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(defaults(
      samples.billogram(customer.data.customer_no, item.data.item_no),
      {
        invoice_date: daysAgo(2).toISOString(),
        due_days: 1
      }
    ))

    await client.billograms.send(billogram.data.id, { method: 'Email' })
    await wait(10000)

    const { status, data } = await client.billograms.collect(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'Collection'
    })
  })

  test('can have a payment registered', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.payment(billogram.data.id, { amount: 100 })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.remaining_sum).toBe(225)
    expect(data.events).toContainObject({
      type: 'Payment'
    })
  })

  test('can have credit applied', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.credit(billogram.data.id, { mode: 'full' })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.remaining_sum).toBe(0)
    expect(data.events).toContainObject({
      type: 'Credit'
    })
  })

  test('can be written off', async () => {
    /* Don't know how to create the situation for to test this api call. */
  })

  test('can be written down', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })
    await wait(10000)

    const { status, data } = await client.billograms.writedown(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'Writedown'
    })
  })

  test('can have a writedown reverted', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })
    await wait(5000)
    await client.billograms.writedown(billogram.data.id)

    const { status, data } = await client.billograms.revertWritedown(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'RevertWritedown'
    })
  })

  test('can have a respite set', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(defaults(
      samples.billogram(customer.data.customer_no, item.data.item_no),
      {
        invoice_date: today.toISOString(),
        due_days: 1
      }
    ))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.respite(billogram.data.id, { date: isoDate(daysFromNow(7)) })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'Respite'
    })
  })

  test('can have a respite removed', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(defaults(
      samples.billogram(customer.data.customer_no, item.data.item_no),
      {
        invoice_date: today.toISOString(),
        due_days: 1
      }
    ))

    await client.billograms.send(billogram.data.id, { method: 'Email' })
    await client.billograms.respite(billogram.data.id, { date: isoDate(daysFromNow(7)) })

    const { status, data } = await client.billograms.removeRespite(billogram.data.id)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'RespiteRemoved'
    })
  })

  test('can have a message sent', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const { status, data } = await client.billograms.message(billogram.data.id, { message: 'Please pay me.' })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
    expect(data.events).toContainObject({
      type: 'CreditorMessage'
    })
  })

  /* Not sure this test is uploading a pdf correctly. */
  test('can have a pdf attached', async () => {
    const [customer, item] = await Promise.all([
      client.customers.create(samples.customer),
      client.items.create(samples.item)
    ])
    const billogram = await client.billograms.create(samples.billogram(customer.data.customer_no, item.data.item_no))

    await client.billograms.send(billogram.data.id, { method: 'Email' })

    const pdf = await readFile('./__tests__/test.pdf')

    const { status, data } = await client.billograms.attach(billogram.data.id, {
      filename: 'test.pdf',
      content: pdf.toString('base64')
    })

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.billogram(customer.data.customer_no, item.data.item_no))
  })

  test('can have its invoice pdf accessed', async () => {
    // TODO
  })
})

describe('customers', () => {
  test('can be created', async () => {
    const { status, data } = await client.customers.create(samples.customer)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.customer)
  })

  test('can be listed', async () => {
    const { status, data } = await client.customers.list()

    expect(status).toBe('OK')
    expect(data).toBeInstanceOf(Array)
  })

  test('can be found', async () => {
    const customer = await client.customers.create(samples.customer)

    const { status, data } = await client.customers.find(customer.data.customer_no)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.customer)
  })

  test('can be updated', async () => {
    const customer = await client.customers.create(samples.customer)

    expect(customer.data).toMatchObject(samples.customer)

    const { status, data } = await client.customers.update(customer.data.customer_no, { name: 'Johnson, Inc' })
    expect(status).toBe('OK')
    expect(data).toMatchObject(defaults({ name: 'Johnson, Inc'}, samples.customer))
  })
})

describe('items', () => {
  test('can be created', async () => {
    const { status, data } = await client.items.create(samples.item)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.item)
  })

  test('can be listed', async () => {
    const { status, data } = await client.items.list()

    expect(status).toBe('OK')
    expect(data).toBeInstanceOf(Array)
  })

  test('can be found', async () => {
    const item = await client.items.create(samples.item)

    const { status, data } = await client.items.find(item.data.item_no)

    expect(status).toBe('OK')
    expect(data).toMatchObject(samples.item)
  })

  test('can be updated', async () => {
    const item = await client.items.create(samples.item)

    expect(item.data).toMatchObject(samples.item)

    const { status, data } = await client.items.update(item.data.item_no, { title: 'House cleaning' })

    expect(status).toBe('OK')
    expect(data).toMatchObject(defaults({ title: 'House cleaning' }, samples.item))
  })
})
