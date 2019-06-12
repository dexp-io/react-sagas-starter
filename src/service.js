import _ from 'lodash'
import axios from 'axios'
import {
  EventEmitter,
} from 'fbemitter'
import {
  API_URL,
} from './config'

const NETWORK_STATUS = 'network_status'

let lastStatus = false

class Service {
  constructor(url) {
    this.url = url
    this.token = localStorage.getItem('token')
    this.token_expired_at = localStorage.getItem('token_expired_at')

    // webSocket
    this.wsUrl = this._wsUrl(`${url}/ws`)
    this.ws = null
    this._isReconnecting = false
    this._connected = false
    this._queue = []
    this.store = null
    this._networkInfo = _.debounce(this.networkInfo, 300)
    this.event = new EventEmitter()
    this.user_id = null
    //this.connect()
  }

  setUserId(id) {
    this.user_id = id
  }

  setApiUrl(url) {
    this.url = url
    this.wsUrl = this._wsUrl(`${url}/ws`)
    this.connect()
  }

  getApiUrl() {
    return this.url
  }

  networkInfo() {
    if (lastStatus !== this._connected) {
      this.event.emit(NETWORK_STATUS, this._connected)
    }
    lastStatus = this._connected
  }

  subScribeNetworkInfo(cb) {
    if (lastStatus !== this._connected) {
      cb(this._connected)
    }
    return this.event.addListener(NETWORK_STATUS, cb)
  }

  setStore = (store) => {
    this.store = store
  }
  connect = () => {
    this.ws = new WebSocket(this.wsUrl)
    // clear timeout of reconnect
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout)
    }
    this.ws.onopen = () => {
      // change status of connected
      this._connected = true
      this._isReconnecting = false
      this._networkInfo(true)
      this.auth()
      this.sendQueue()
    }

    this.ws.onmessage = (message) => {
      if (typeof message.data === 'string') {

        const payload = JSON.parse(message.data)
        this.event.emit(payload.action, payload.payload)

      }
    }

    this.ws.onerror = (err) => {
      console.log('error', err)
      this._connected = false
      this._isReconnecting = false
      this.reconnect()
      this._networkInfo(false)
    }
    this.ws.onclose = (e) => {
      this._connected = false
      this._isReconnecting = false
      this.reconnect()
      this._networkInfo(false)
    }
  }

  sendQueue = () => {
    if (this._queue.length) {
      this._queue.forEach((q, index) => {
        this.send(q.payload)
        delete this._queue[index]
      })
    }
  }

  register(payload) {
    payload.allow_send_sms = payload.allow_send_sms || false
    const query = `
    mutation createUser($input: NewUser!){
      createUser(input: $input)
      {
        id,
        first_name
        last_name
      }
    }`

    const referral_token = localStorage.getItem('share')
    if (referral_token) {
      payload.referral_token = referral_token
    }
    return new Promise((resolve, reject) => {
      this.request(query, {
        input: payload,
      }).then((res) => {
        let user = _.get(res, 'createUser')
        resolve(user)
      }).catch(err => {
        reject(err)
      })
    })
  }

  login(payload) {
    const query = `mutation login {
      login(input: {email: "${payload.email}", password: "${payload.password}"}){
        token
        expired_at
        user{
          id
          first_name
          last_name
          email
          avatar
          street
          city
          state
          zipcode
          phone
          allow_send_sms
          facebook
          twitter
          instagram
          created_at
          roles{
            id
            name
          }
        }
      }
    }`

    return new Promise((resolve, reject) => {
      this.request(query).then((res) => {

        if (res) {
          this.setUserId(res.login.user.id)
          this.setToken(res.login.token)
          resolve(res.login.user)
        } else {
          resolve(null)
        }
      }).catch(err => {
        reject(err)
      })
    })
  }

  logout() {

    this.send({
      action: 'logout',
      payload: {
        token: this.getTokenString(),
      },
    })

    this.token = null
    this.user_id = null
    localStorage.removeItem('userToken')
  }

  auth() {

    if (this.token) {
      this.send({
        action: 'auth',
        payload: {
          token: this.getTokenString(),
        },
      })
    }
  }

  send(msg) {
    if (!msg) {
      return
    }
    if (this._connected === true && this.ws.readyState === 1) {
      const message = JSON.stringify(msg)
      this.ws.send(message)
    } else {
      this._queue.push({
        type: 'message',
        payload: msg,
      })
    }
  }

  _wsUrl = (url) => {
    url = _.replace(url, 'http://', 'ws://')
    url = _.replace(url, 'https://', 'wss://')
    return url
  }

  reconnect() {
    // if is reconnecting so do nothing
    if (this._isReconnecting || this._connected) {
      return
    }
    // Set timeout
    this._isReconnecting = true
    this._reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting....')
      this.connect()
    }, 2000)
  }

  setToken(token = {}) {
    localStorage.setItem('userToken', token.token)
    this.token = token
    this.token_expired_at = token.expired_at
    // auth to socket
    this.auth()
  }

  getToken() {
    if (this.token) {
      return this.token
    }
    return localStorage.getItem('userToken')
  }

  getTokenString() {
    if (this.token == null) {
      return ''
    }
    return this.token
  }

  get(url, options = null) {
    return axios.get(url, options)
  }

  upload(file, isAvatar = false) {
    let formData = new FormData()
    formData.append('file', file)
    return new Promise((resolve, reject) => {
      let requestOptions = {
        url: `${this.url}/${isAvatar ? 'change-avatar' : 'upload'}`,
        method: 'post',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${this.getTokenString()}`,
        },
        withCredentials: true,
        data: formData,
      }

      if (!this.token) {
        delete requestOptions.headers.Authorization
      }

      axios(requestOptions).then((result) => {
        return resolve(result.data)
      }).catch((e) => {
        return reject(e)
      })

    })

  }

  request(query, variables = null) {
    return new Promise((resolve, reject) => {
      let requestOptions = {
        url: `${this.url}/query`,
        method: 'post',
        headers: {
          Authorization: `Bearer ${this.getTokenString()}`,
        },
        withCredentials: true,
        data: {
          query: query,
          variables: variables,
        },
      }

      if (!this.token) {
        delete requestOptions.headers.Authorization
      }

      axios(requestOptions).then((result) => {
        if (_.get(result, 'data.errors')) {
          return reject(result.data.errors)
        }
        return resolve(result.data.data)
      }).catch((e) => {
        return reject(e)
      })

    })
  }

}

export default new Service(API_URL)