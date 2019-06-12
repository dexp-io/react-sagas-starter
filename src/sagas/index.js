import {take, put, call, fork, select, all} from 'redux-saga/effects'
import {NAVIGATE, SET_CURRENT_USER} from '../types'
import {history} from '../history'
import {queryLoadCurrentUser} from '../queries'

function* watchNavigate() {
  while (true) {
    const {path} = yield take(NAVIGATE)
    yield history.push(path)
  }
}

function* startApp() {
  const {app} = yield select()
  if (!app.currentUser) {
    const user = yield call(queryLoadCurrentUser)
    yield put({
      type: SET_CURRENT_USER,
      payload: user,
    })
  }
}

export default function* root() {
  yield all([
    call(startApp),
    fork(watchNavigate),
  ])
}