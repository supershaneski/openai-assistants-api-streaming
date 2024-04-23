'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ClearIcon from '@mui/icons-material/Clear'
import SendIcon from '@mui/icons-material/Send'
import ResetIcon from '@mui/icons-material/RestartAlt'
import Message from '@/components/message'
import classes from './sandbox.module.css'
import { useAppStore } from '@/store/appstore'
import { SimpleId } from '@/lib/utils'

export default function Sandbox() {

    const threadId = useAppStore((state) => state.threadId)
    const setThreadId = useAppStore((state) => state.setThreadId)

    const timRef = React.useRef(null)
    const messageRef = React.useRef(null)
    //const inputRef = React.useRef(null)

    const [messageItems, setMessageItems] = React.useState([])
    const [inputText, setInputText] = React.useState('')
    const [isLoading, setLoading] = React.useState(false)
    const [isMounted, setMounted] = React.useState(false)
    const [isWaiting, setWaiting] = React.useState(false)
    const [isComposing, setComposing] = React.useState(false)

    React.useEffect(() => {

        setMounted(true)

    }, [])

    React.useEffect(() => {
        
        if(isMounted) {

            if(threadId) {

                /**
                 * Delete previous thread when app starts
                 */
                deleteThread(threadId)

                setThreadId('')

            }

        }

    }, [isMounted])

    const deleteThread = async (thread_id) => {

        try {
            const response = await fetch('/api/thread', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ thread_id })
            })

            const result = await response.json()

            console.log(result)

        } catch(e) {
            console.log(e.message)
        }

    }

    const handleSubmit = async (e) => {

        e.preventDefault()

        setLoading(true)

        const text = inputText

        const message = {
            id: SimpleId(),
            role: 'user',
            createdAt: Date.now(),
            content: text,
        }

        setMessageItems((prev) => [...prev, ...[message]])

        setInputText('')

        resetScroll()

        try {

            const response = await fetch('/api/stream', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    thread_id: threadId,
                })
            })

            const reader = response.body.getReader()

            const assistantId = SimpleId()

            const assistant_message = {
                id: assistantId,
                role: 'assistant',
                createdAt: Date.now(),
                content: '',
            }
    
            setMessageItems((prev) => [...prev, ...[assistant_message]])
            setWaiting(true)

            resetScroll()
            
            let is_completed = false
            let thread_id = threadId

            while(!is_completed) {

                const { done, value } = await reader.read()
        
                if(done) {
                    is_completed = true
                    break
                }

                const raw_delta = new TextDecoder().decode(value)

                let delta

                try {
                    
                    delta = JSON.parse(raw_delta)
                    
                    if (typeof delta !== 'object' || delta === null) {
                        delta = null
                        throw new Error('Parsed JSON is not an object')
                    }

                } catch(e) {
                    console.log(e.message)
                }

                if(delta) {
                    
                    if(delta.thread_id) {

                        thread_id = delta.thread_id

                    } else if(delta.wait) {

                        setWaiting(true)

                        resetScroll()

                    } else if(delta.longwait) {

                        setMessageItems((prev) => {
                            return prev.map((a) => {
                                return {
                                    ...a,
                                    content: a.id !== assistantId ? a.content : a.content + '\n\n'
                                }
                            })
                        })

                        setWaiting(true)

                        resetScroll()

                    }

                } else {

                    setWaiting(false)

                    setMessageItems((prev) => {
                        return prev.map((a) => {
                            return {
                                ...a,
                                content: a.id !== assistantId ? a.content : a.content + raw_delta
                            }
                        })
                    })

                }
                
            }

            setWaiting(false)

            setThreadId(thread_id)
            
            resetScroll()

        } catch(e) {
            
            console.log(e.message)

        } finally {
            
            setLoading(false)

        }

    }

    const resetScroll = () => {
        clearTimeout(resetScroll)
        timRef.current = setTimeout(() => {
            messageRef.current.scrollTop = messageRef.current.scrollHeight
        }, 100)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if(!isComposing) {
                handleSubmit(e)
            }
        }
    }

    const handleStartComposition = () => {
        setComposing(true)
    }

    const handleEndComposition = () => {
        setComposing(false)
    }

    const handleReset = () => {

        deleteThread(threadId)

        setThreadId('')
        setMessageItems([])

    }

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <span>Test</span>
                <IconButton onClick={handleReset}>
                    <ResetIcon />
                </IconButton>
            </div>
            <div className={classes.messages} ref={messageRef}>
                {
                    messageItems.map((msg, index) => {
                        return (
                            <Message key={msg.id} message={msg} isWaiting={index === messageItems.length - 1 && isWaiting} />
                        )
                    })
                }
            </div>
            <div className={classes.input}>
                <Box 
                component='form' 
                onSubmit={handleSubmit} 
                noValidate>
                    <TextField
                    className={classes.inputText}
                    disabled={isLoading}
                    fullWidth
                    multiline
                    maxRows={3}
                    inputRef={(input) => input && input.focus()}
                    //inputRef={inputRef}
                    value={inputText}
                    placeholder='Write your message'
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={handleStartComposition}
                    onCompositionEnd={handleEndComposition}
                    autoFocus
                    //focused
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position='end'>
                                <IconButton 
                                onClick={() => setInputText('')}
                                disabled={!inputText || isLoading}
                                >
                                    <ClearIcon fontSize='inherit'/>
                                </IconButton>
                                <IconButton 
                                onClick={(e) => handleSubmit(e)} 
                                disabled={!inputText || isLoading}
                                >
                                    <SendIcon fontSize='inherit'/>
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    />
                </Box>
            </div>
        </div>
    )
}
