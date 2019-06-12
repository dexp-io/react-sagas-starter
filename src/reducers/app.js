import {SET_CURRENT_USER} from '../types'

const initState = {
  currentUser: null,
}
export default (state = initState, action) => {

  switch (action.type) {

    case SET_CURRENT_USER:

      console.log("payload", action)
      return {
        ...state,
        currentUser: action.payload,
      }
    default:
      return state
  }
}