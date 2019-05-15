import axios from 'axios'
import has from 'lodash.has'
import defaults from 'lodash.defaults'

const API_BASE = 'https://billogram.com/api/v2/'
const SANDBOX_API_BASE = 'https://sandbox.billogram.com/api/v2/'

export default class Billogram {
  constructor(auth, config) {
    const instance = axios.create({
      baseURL: config.sandbox ? SANDBOX_API_BASE : API_BASE,
      auth
    })

    instance.interceptors.response.use(
      ({ data }) => data,
      error => console.error(has(error, 'response') ? error.response.data : error)
    )

    this._http = {
      get: (path, params) => instance.get(path, {
        params: defaults(params, { page: 1, page_size: 100 })
      }),
      post: (path, data, config) => instance.post(path, data, config),
      put: (path, data, config) => instance.put(path, data, config),
      delete: (path, config) => instance.delete(path, null, config)
    }
  }

  billograms = {
    create: data => this._http.post('billogram', data),
    list: params => this._http.get('billogram', params),
    find: id => this._http.get(`billogram/${id}`),
    update: (id, data) => this._http.put(`billogram/${id}`, data),
    send: (id, data) => this._http.post(`billogram/${id}/command/send`, data),
    sell: id => this._http.post(`billogram/${id}/command/sell`),
    resend: (id, data) => this._http.post(`billogram/${id}/command/resend`, data),
    remind: (id, data) => this._http.post(`billogram/${id}/command/remind`, data),
    collect: id => this._http.post(`billogram/${id}/command/collect`),
    payment: (id, data) => this._http.post(`billogram/${id}/command/payment`, data),
    credit: (id, data) => this._http.post(`billogram/${id}/command/credit`, data),
    writeoff: id => this._http.post(`billogram/${id}/command/writeoff`),
    writedown: id => this._http.post(`billogram/${id}/command/writedown`),
    revertWritedown: id => this._http.post(`billogram/${id}/command/revert-writedown`),
    respite: (id, data) => this._http.post(`billogram/${id}/command/respite`, data),
    removeRespite: id => this._http.post(`billogram/${id}/command/remove-respite`),
    message: (id, data) => this._http.post(`billogram/${id}/command/message`, data),
    attach: (id, data) => this._http.post(`billogram/${id}/command/attach`, data),
    pdf: (id, params) => this._http.get(`billogram/${id}.pdf`, params)
  }

  customers = {
    create: data => this._http.post('customer', data),
    list: params => this._http.get('customer', params),
    find: customerNumber => this._http.get(`customer/${customerNumber}`),
    update: (customerNumber, data) => this._http.put(`customer/${customerNumber}`, data)
  }

  items = {
    create: data => this._http.post('item', data),
    list: params => this._http.get('item', params),
    find: itemNumber => this._http.get(`item/${itemNumber}`),
    update: (itemNumber, data) => this._http.put(`item/${itemNumber}`, data),
    delete: itemNumber => this._http.delete(`item/${itemNumber}`)
  }
}
