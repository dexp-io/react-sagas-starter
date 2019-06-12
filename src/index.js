import React from 'react'
import ReactDOM from 'react-dom'
import {Provider} from 'react-redux'
import App from './components/App'
import rootSaga from './sagas'
import * as serviceWorker from './serviceWorker'
import configureStore from './store'
import './assets/css/style.css'

const store = configureStore()
store.runSaga(rootSaga)

ReactDOM.render((
    <Provider store={store}>
      <App/>
    </Provider>
), document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
