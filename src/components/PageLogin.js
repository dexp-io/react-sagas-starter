import React from 'react'
import styled from 'styled-components'
import {connect} from 'react-redux'
import {Link} from 'react-router-dom'
import {
  Button,
  Heading,
  Pane,
  Text,
  TextInputField,
  toaster,
} from 'evergreen-ui'
import _ from 'lodash'
import {validateEmail} from '../utils'
import Service from '../service'
import {setCurrentUser, redirect} from '../actions'

const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
  @media(min-width: 991px){
    padding-top: 50px;
  }
  form{
    margin-top: 30px;
    a{
      text-decoration: none;
      color: #425A70;
    }
  }
`

class PageLogin extends React.Component {

  state = {
    loading: false,
    error: {
      email: false,
      password: false,
    },
    email: '',
    password: '',
  }

  onSubmit = (e) => {
    const {email, password} = this.state
    e.preventDefault()
    if (this.isValid()) {

      const q = `mutation login($email: String!, $password: String!){
        login(email: $email, password: $password){
          token
          expired_at
          user{
            id
            avatar
            is_online
            first_name
            last_name
            email
            address
            created_at
            updated_at
          }
        }
      }`

      this.setState({
        loading: true,
      }, () => {
        Service.request(q, {
          email,
          password,
        }).then((r) => {
          const res = r.login

          this.setState({
            loading: false,
          }, () => {
            Service.setToken({token: res.token, expired_at: res.expired_at})
            this.props.setCurrentUser(res.user)
            this.props.redirect('/')
          })

        }).catch(e => {
          toaster.warning(_.get(e, '[0].message', 'Login error'), {
            id: 'forbidden-action',
          })
          this.setState({
            loading: false,
          })
        })
      })

    }
  }

  isValid = () => {
    const {error} = this.state
    return error.email === false && error.password === false
  }

  render() {

    const {error, email, password, loading} = this.state
    return (
        <Container className={'page-login'}>

          <Pane
              padding={30}
              border="default"
          >
            <Heading textAlign={'center'} is="h1">Log In</Heading>
            <form onSubmit={this.onSubmit}>
              <TextInputField
                  value={email}
                  onChange={(e) => {
                    const value = e.target.value
                    this.setState({
                      email: e.target.value,
                      error: {
                        ...error,
                        email: !validateEmail(value),
                      },
                    })
                  }}
                  type={'email'}
                  isInvalid={error.email}
                  required
                  label="Email"
              />
              <TextInputField
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value
                    this.setState({
                      password: value,
                      error: {
                        ...error,
                        password: !value,
                      },
                    })
                  }}
                  type={'password'}
                  isInvalid={error.password}
                  required
                  label="Password"
              />
              <Pane>
                <Link to="/password"><Text color="neutral">Forgot your
                  password?</Text></Link>
              </Pane>

              <Pane display="flex" justifyContent="flex-end">
                <Button
                    isLoading={loading}
                    type={'submit'}
                    disabled={!this.isValid()}
                    appearance="primary">Login</Button>
              </Pane>
            </form>
          </Pane>
        </Container>
    )
  }
}

export default connect(
    state => ({
      currentUser: state.app.currentUser,
    }),
    {setCurrentUser, redirect},
)(PageLogin)