import Service from '../service'

export const queryLoadCurrentUser = () => {

  return new Promise((resolve) => {
    const q = `query me{ me {id, first_name, last_name, email, avatar} }`
    Service.request(q).then((res) => {
      resolve(res.me)
    }).catch((e) => {
      resolve(null)
    })
  })
}