import React from 'react'
import styled from 'styled-components'
import {connect} from 'react-redux'
import {Button, Heading, Pane, Text, TextInputField} from 'evergreen-ui'
import _ from 'lodash'

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

class PageForgotPassword extends React.Component {

  state = {
    error: {
      email: false,
    },
    email: '',
  }

  onSubmit = (e) => {
    e.preventDefault()
  }

  isValid = () => {
    const {error} = this.state
    _.each(error, (k, v) => {
      if (k === true) {
        return false
      }
    })
    return true
  }

  render() {

    const {error, email} = this.state
    return (
        <Container className={'page-login'}>
          <Pane
              padding={30}
              border="default"
          >
            <Heading textAlign="center" is="h1">Forgot your password?</Heading>
            <form onSubmit={this.onSubmit}>
              <TextInputField
                  value={email}
                  onChange={(e) => {
                    this.setState({
                      email: e.target.value,
                    })
                  }}
                  type={'email'}
                  isInvalid={error.email}
                  required
                  label="Email"
              />
              <Pane display="flex" justifyContent="flex-end">
                <Button
                    disabled={!this.isValid()}
                    appearance="primary">Send Me Instructions</Button>
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
)(PageForgotPassword)