import React from 'react'
import styled from 'styled-components'

const Container = styled.div`

`
export default class Layout extends React.Component {

  render() {
    return (
        <Container className={'main-layout'}>
          {this.props.children}
        </Container>
    )
  }
}

