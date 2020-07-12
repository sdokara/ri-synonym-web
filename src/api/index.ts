import axios, { AxiosPromise, Method } from 'axios'
import config from '@/config'

function request(method: Method, path: string, params: any = null, data: any = null, headers: any = null): AxiosPromise {
  const url = config.serverUri + path
  return axios({ method, url, params, data, headers })
}

export default {
  addTwoSynonyms(word1: string, word2: string): AxiosPromise {
    return request('post', '/synonyms', { word1, word2 })
  },
  addSynonyms(words: string[]): AxiosPromise {
    return request('post', '/synonyms', { words })
  },
  getSynonyms(word: string): AxiosPromise {
    return request('get', '/synonyms', { word })
  }
}
