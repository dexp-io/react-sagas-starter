import {Router, Route, Switch} from 'react-router-dom'
import {history} from '../history'
import React from 'react'
import PageDashboard from './PageDashboard'
import PageLogin from './PageLogin'
import PageForgotPassword from './PageForgotPassword'

export default () => {
  return (
      <Router history={history}>
        <Switch>
          <Route
              exact={true}
              path="/"
              component={PageDashboard}/>
          <Route
              exact={true}
              path="/login"
              component={PageLogin}/>
          <Route
              exact={true}
              path="/password"
              component={PageForgotPassword}/>
        </Switch>
      </Router>
  )
}