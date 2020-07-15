import axios, { AxiosPromise, Method } from 'axios'
import config from '@/config'

function request(method: Method, path: string, params: any = null, data: any = null, headers: any = null): AxiosPromise {
  const url = config.serverUri + path
  return axios({ method, url, params, data, headers })
}

export default {
  addSynonyms(words: string[]): AxiosPromise {
    return request('post', '/synonyms', null, words)
  },
  getSynonyms(word: string): AxiosPromise {
    return request('get', '/synonyms', { word })
  }
}
