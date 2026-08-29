import { defineStore } from 'pinia'

export const useQuizStore = defineStore('quiz', {
  state: () => ({
    questions: [],       // [{ id, text, multiple, options: [{id, text, correct}] }]
    answers: {},         // { [questionId]: string | string[] }
    fileName: '',
    status: 'idle',      // idle | loading | ready | error | finished
    errorMessage: ''
  }),

  getters: {
    total: (state) => state.questions.length,

    answeredCount: (state) =>
      Object.keys(state.answers).filter((qid) => {
        const a = state.answers[qid]
        return Array.isArray(a) ? a.length > 0 : !!a
      }).length,

    isComplete(state) {
      return this.total > 0 && this.answeredCount === this.total
    },

    results(state) {
      return state.questions.map((q) => {
        const given = state.answers[q.id]
        const correctIds = q.options.filter((o) => o.correct).map((o) => o.id)
        let isCorrect = false

        if (q.multiple) {
          const givenArr = Array.isArray(given) ? [...given].sort() : []
          const correctArr = [...correctIds].sort()
          isCorrect =
            givenArr.length === correctArr.length &&
            givenArr.every((v, i) => v === correctArr[i])
        } else {
          isCorrect = !!given && correctIds.includes(given)
        }

        return { question: q, given, correctIds, isCorrect }
      })
    },

    score(state) {
      const res = this.results
      const correct = res.filter((r) => r.isCorrect).length
      return {
        correct,
        total: res.length,
        percent: res.length ? Math.round((correct / res.length) * 100) : 0
      }
    }
  },

  actions: {
    setQuestions(questions, fileName) {
      this.questions = questions
      this.fileName = fileName
      this.answers = {}
      this.status = 'ready'
      this.errorMessage = ''
    },

    setError(message) {
      this.status = 'error'
      this.errorMessage = message
    },

    setLoading() {
      this.status = 'loading'
      this.errorMessage = ''
    },

    setAnswerSingle(questionId, optionId) {
      this.answers[questionId] = optionId
    },

    toggleAnswerMultiple(questionId, optionId) {
      const current = Array.isArray(this.answers[questionId])
        ? [...this.answers[questionId]]
        : []
      const idx = current.indexOf(optionId)
      if (idx === -1) current.push(optionId)
      else current.splice(idx, 1)
      this.answers[questionId] = current
    },

    submit() {
      this.status = 'finished'
    },

    restart() {
      this.answers = {}
      this.status = 'ready'
    },

    reset() {
      this.questions = []
      this.answers = {}
      this.fileName = ''
      this.status = 'idle'
      this.errorMessage = ''
    }
  }
})
