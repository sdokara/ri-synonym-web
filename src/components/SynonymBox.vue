<template>
  <div class="container">
    <div class="row justify-content-md-center">
      <div class="col-md-7 input-group">
        <div class="input-group-prepend">
          <button class="btn btn-primary" type="button"
                  @click="toggleMode"
                  :title="mode === 'lookup' ? 'Switch to Insert Mode' : 'Switch to Lookup Mode'">
            <b-icon :icon="mode === 'lookup' ? 'search' : 'plus-circle'"/>
          </button>
        </div>
        <template v-if="mode === 'lookup'">
          <input ref="inLookup" type="text" class="form-control lookup shadow-none"
                 v-model="input"
                 @keydown="lookupKeyDown">
          <div class="lookup-dropdown border border-primary rounded-left fade"
               :class="{'show': input.length > 0 && results.length > 0}">
            <div v-for="word in results" v-bind:key="word" class="lookup-result">
              <span class="lookup-result">{{ word }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="form-control insert-container"
               :class="{'border-primary': inFocused}"
               @click="insertFocus"
               @focusin="inFocused = true"
               @focusout="inFocused = false">
          <span v-for="(word, index) in words" v-bind:key="word" class="insert-word">
            <div class="btn-group">
              <span class="btn btn-sm disabled"
                    :class="[word === duplicate ? 'btn-outline-danger' : 'btn-outline-primary']">
                {{ word }}
              </span>
              <button type="button" class="btn btn-sm" title="Remove"
                      :class="[word === duplicate ? 'btn-outline-danger' : 'btn-outline-primary']"
                      @click="() => insertRemove(index)">
                <b-icon icon="x"/>
              </button>
            </div>
          </span>
            <input ref="inInsert" class="insert" type="text"
                   :style="{width: inputWidth}"
                   v-model="input"
                   @keydown="insertKeyDown"
                   @blur="duplicate = null">
          </div>
          <div class="input-group-append">
            <button class="btn btn-success" type="button" title="Insert synonyms"
                    @click="insertInsert"
                    :disabled="words.length < 2 || input.length > 0">
              <b-icon icon="check-circle"/>
            </button>
          </div>
        </template>
        <div class="alert alert-dismissible fade in text-left"
             :class="[alert && `alert-${alert.type}`, {'show': alert !== null}]"
             style="width: 100%"
             role="alert">
          <span v-html="alert && alert.message"/>
          <button type="button" class="close" aria-label="Close" @click="alert = null">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import api from '@/api'
  import _ from 'lodash'
  import { AxiosError } from 'axios'

  const focus = (element: Element) => (element as HTMLElement).focus()
  const LOOKUP_TIMEOUT = 200
  const ALERT_TIMEOUT = 3000

  interface Alert {
    type: 'success' | 'danger' | 'info';
    message: string;
  }

  export default Vue.extend({
    name: 'SynonymBox',
    data() {
      return {
        mode: 'lookup' as 'lookup' | 'insert',
        input: '',

        results: [] as string[],
        words: [] as string[],

        inFocused: false,
        duplicate: null as string | null,

        alert: null as Alert | null,
        alertInterval: -1,
        dispatchedAlerts: [] as Alert[]
      }
    },
    computed: {
      inputWidth(): string {
        return `min(${this.input.length + 1}ch, 100%)`
      }
    },
    watch: {
      // these cannot be arrow functions due to vue's injection of `this`
      input: async function (word: string) {
        if (this.mode === 'lookup') {
          await this.lookupLookup(word)
        }
      }
    },
    created() {
      this.apiLookup = _.debounce(this.apiLookup, LOOKUP_TIMEOUT) as (word: string) => Promise<void>
    },
    mounted() {
      focus(this.$refs.inLookup)
      this.dispatchHint({
        type: 'info',
        message: 'You are in <b>Lookup Mode</b><br/>' +
          'Start typing to lookup synonyms, or<br/>' +
          'Press <b>Ctrl+Enter</b> or click <b>&#128269;</b> to switch to <b>Insert Mode</b>'
      })
    },
    methods: {
      toggleMode() {
        this.mode = this.mode === 'lookup' ? 'insert' : 'lookup'
        this.$nextTick(() => {
          if (this.mode === 'lookup') {
            focus(this.$refs.inLookup)
            this.lookupLookup(this.input)
          } else {
            focus(this.$refs.inInsert)
            this.dispatchHint({
              type: 'info',
              message: 'You are in <b>Insert Mode</b><br/>' +
                'Type <b>word [space] word [space]</b> to insert a synonym pair, or<br/>' +
                'Press <b>Ctrl+Enter</b> or click <b>+</b> to switch back to <b>Lookup Mode</b>'
            })
          }
        })
      },

      lookupKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault()
          this.toggleMode()
        } else if (e.key === 'Delete' && e.ctrlKey) {
          e.preventDefault()
          this.clearSynonyms()
        }
      },
      async lookupLookup(word: string) {
        word = word.trim()
        if (word.length === 0) {
          this.results = []
          this.alert = null
          return
        }
        await this.apiLookup(word)
      },
      async apiLookup(word: string) {
        try {
          const res = await api.getSynonyms(word)
          this.results = res.data.length > 0 ? res.data : ['No synonyms found']
          this.alert = null
        } catch (err) {
          this.dispatchError(err)
        }
      },

      insertKeyDown(e: KeyboardEvent) {
        switch (e.key) {
          case ' ': {
            e.preventDefault()
            const words = this.input.split(' ').map(word => word.toLowerCase())
            for (const word of words) {
              if (word.length === 0) {
                continue
              }
              if (this.words.includes(word)) {
                if (words.length === 1) {
                  this.duplicate = word
                  this.dispatchAlert({ type: 'danger', message: 'A word cannot be a synonym of itself' })
                }
                return
              }
              this.words.push(word)
              if (this.words.length === 2) {
                this.dispatchHint({
                  type: 'info',
                  message: 'Type more words to add, or<br/>' +
                    'Press <b>Enter</b> or click <b>&#10003;</b> to insert the synonyms'
                })
              }
            }
            this.input = ''
            break
          }
          case 'Backspace': {
            if (this.input.length === 0 && this.words.length > 0) {
              this.words.splice(this.words.length - 1)
            } else {
              this.duplicate = null
            }
            break
          }
          case 'Enter': {
            e.preventDefault()
            if (e.ctrlKey) {
              this.toggleMode()
            } else if (this.input.length === 0 && this.words.length > 1) {
              this.insertInsert()
            }
            break
          }
          case 'Delete': {
            if (e.ctrlKey) {
              e.preventDefault()
              this.clearSynonyms()
            }
            break
          }
          default: {
            this.duplicate = null
            break
          }
        }
      },
      insertFocus() {
        focus(this.$refs.inInsert)
      },
      insertRemove(index: number) {
        this.words.splice(index, 1)
      },
      async insertInsert() {
        try {
          await api.addSynonyms(this.words)
          this.input = ''
          this.words = []
          focus(this.$refs.inInsert)
          this.dispatchAlert({ type: 'success', message: 'Synonyms saved' })
        } catch (err) {
          this.dispatchError(err)
        }
      },

      async clearSynonyms() {
        try {
          await api.clearSynonyms()
          this.dispatchAlert({ type: 'success', message: 'Synonyms cleared' })
        } catch (err) {
          this.dispatchError(err)
        }
      },

      dispatchAlert(alert: Alert, persistent = false) {
        this.alert = alert
        clearInterval(this.alertInterval)
        if (!persistent) {
          this.alertInterval = setTimeout(() => {
            this.alert = null
          }, ALERT_TIMEOUT)
        }
      },
      dispatchHint(alert: Alert) {
        if (_.some(this.dispatchedAlerts, dispatched => _.isEqual(dispatched, alert))) {
          return
        }
        this.dispatchAlert(alert, true)
        this.dispatchedAlerts.push(alert)
      },
      dispatchError(err: AxiosError) {
        this.dispatchAlert({ type: 'danger', message: err.response?.data.message || err.message })
      }
    }
  })
</script>

<style scoped lang="scss">
  @import 'node_modules/bootstrap/scss/bootstrap';

  input.lookup {
    height: 50px;
    padding-top: 2px;
    padding-bottom: 2px;

    &:focus {
      border-color: $primary !important;
    }
  }

  div.lookup-dropdown {
    position: absolute;
    top: 50px;
    width: calc(100% - 30px);
    border-top: none !important;
    max-height: 360px;
    overflow-y: auto;
  }

  div.lookup-result {
    padding: 6px 12px 6px 12px;
    text-align: left;
  }

  span.lookup-result {
    cursor: default;
    word-break: break-word;
  }

  div.insert-container {
    min-height: 50px !important;
    height: unset !important;
  }

  span.insert-word {
    float: left;
    margin-top: 2px;
    margin-bottom: 2px;
    margin-right: 10px;
    word-break: break-word;

    & > div > span {
      text-align: left !important;
    }
  }

  input.insert {
    position: relative;
    float: left;
    height: 32px;
    margin-top: 2px;
    margin-bottom: 2px;
    padding: 0 !important;
    border: 0 none !important;

    &:focus {
      outline: none !important;
    }
  }
</style>
