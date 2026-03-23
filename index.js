require('dotenv').config()
const express = require('express')
const line = require('@line/bot-sdk')
const fs = require('fs')
const { ADMIN_IDS } = require('./config')

const middlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET
}

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

const app = express()

let responses = {}
if (fs.existsSync('responses.json')) {
  responses = JSON.parse(fs.readFileSync('responses.json'))
}

app.post('/webhook', line.middleware(middlewareConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err)
      res.status(500).end()
    })
})

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text' || event.source.type !== 'user') {
    return null
  }

  const userId = event.source.userId
  const text = event.message.text.trim()
  const isAdmin = ADMIN_IDS.includes(userId)

  if (text.startsWith('!set ')) {
    if (!isAdmin) return reply(event.replyToken, 'sorry! that one is a̲d̲m̲i̲n̲ only')
    
    const parts = text.slice(5).split(' ')
    const command = parts[0]
    const response = parts.slice(1).join(' ')
    
    if (!command || !response) return reply(event.replyToken, 'formatnya: !set [command] [isi]')

    responses[command] = response
    saveResponses()
    return reply(event.replyToken, `i'm taking notes, .${command} saved!`)
  }

  if (text.startsWith('!delete ')) {
    if (!isAdmin) return reply(event.replyToken, 'sorry! that one is a̲d̲m̲i̲n̲ only')
    
    const command = text.slice(8).trim()
    if (responses[command]) {
      delete responses[command]
      saveResponses()
      return reply(event.replyToken, `poof... .${command} gone`)
    }
    return reply(event.replyToken, `hmm, .${command} not found! :<`)
  }

  if (text === '!comlist') {
    if (!isAdmin) return reply(event.replyToken, 'sorry! that one is a̲d̲m̲i̲n̲ only')
    
    const keys = Object.keys(responses)
    if (keys.length === 0) return reply(event.replyToken, 'hmm, nothing is here yet. (๑•᎑•๑)')
    
    const list = keys.map(k => `.${k}`).join('\n')
    return reply(event.replyToken, `here's my notes!\n\n${list}\n\n𓏵`)
  }

  if (text.startsWith('.')) {
    const command = text.slice(1).trim()

    if (command === 'getid') {
      return reply(event.replyToken, `your id: ${userId}`)
    }

    if (responses[command]) {
      return reply(event.replyToken, responses[command])
    }
  }

  return null
}

function reply(replyToken, message) {
  return client.replyMessage({
    replyToken: replyToken,
    messages: [{ type: 'text', text: message }]
  })
}

function saveResponses() {
  fs.writeFileSync('responses.json', JSON.stringify(responses, null, 2))
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`bot is running on port ${PORT}`))