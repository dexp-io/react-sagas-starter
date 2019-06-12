import _ from 'lodash'
import axios from 'axios'
import moment from 'moment'
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
    this._networkInfo = _.debounce(this.networkInfo, 300)
    this.event = new EventEmitter()
    this.user_id = null
    //this.connect()

    // handle refresh token
    this.refreshTokenTimeout = this.refreshTokenBackgroundTask()
  }

  refreshTokenBackgroundTask() {

    if (this.token_expired_at && this.token) {

      const timeInterval = moment(this.token_expired_at).unix() -
          moment().unix()

      const _this = this
      setTimeout(function() {
        _this.refreshToken()
      }, timeInterval * 1000)
    }
  }

  refreshToken() {
    const q = `mutation refreshToken{ refreshToken{ token, expired_at } }`
    this.request(q).then((res) => {
      this.setToken(res.refreshToken)
    })
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

  logout() {

    this.send({
      action: 'logout',
      payload: {
        token: this.getTokenString(),
      },
    })

    this.token = null
    this.user_id = null
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout)
    }
    localStorage.removeItem('token_expired_at')
    localStorage.removeItem('token')
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
    console.log('to', token)
    localStorage.setItem('token', token.token)
    localStorage.setItem('token_expired_at', token.expired_at)
    this.token = token
    this.token_expired_at = token.expired_at
    this.refreshTokenBackgroundTask()

    // auth to socket
    this.auth()
  }

  getToken() {
    if (this.token) {
      return this.token
    }
    return localStorage.getItem('token')
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