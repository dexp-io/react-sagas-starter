import {INIT, NAVIGATE, SET_CURRENT_USER} from '../types'

export const init = () => {
  return {
    type: INIT,
  }
}

export const setCurrentUser = (user) => {
  return {
    type: SET_CURRENT_USER,
    payload: user,
  }
}

export const redirect = (path) => {

  return {
    type: NAVIGATE,
    path,
  }
}