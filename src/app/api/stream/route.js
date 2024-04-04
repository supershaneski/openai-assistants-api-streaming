import openai from '@/service/openai'

import { mockAPI } from '@/lib/utils'

export async function POST(request) {

    let { message, thread_id } = await request.json()

    if (!message) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    let thread

    if (thread_id) {
        try {
            thread = await openai.beta.threads.retrieve(thread_id)
        } catch(e) {
            console.error(`Failed to retrieve thread: ${e.message}`)
        }
    }

    if (!thread) {
        try {
            thread = await openai.beta.threads.create()
            thread_id = thread.id
        } catch(e) {
            console.error(`Failed to create thread: ${e.message}`)

            return new Response('Bad request', {
                status: 400,
            })
        }
    }

    const ret_message = await openai.beta.threads.messages.create(
        thread_id,
        {
          role: 'user',
          content: message
        }
    )

    console.log(ret_message)
    
    return new Response(
        new ReadableStream({
            async pull(controller) {

                // send thread id
                controller.enqueue(JSON.stringify({ thread_id, wait: true }))

                let tool_outputs = []
                let is_completed = false
                let loop_count = 0
                let run_id

                while(!is_completed) {

                    console.log(`Loop: ${loop_count}`)

                    let stream = tool_outputs.length === 0 ? await openai.beta.threads.runs.create(
                        thread_id,
                        {
                          assistant_id: process.env.OPENAI_ASSISTANT_ID,
                          stream: true
                        }
                    ) : openai.beta.threads.runs.submitToolOutputsStream(
                        thread_id,
                        run_id,
                        {
                            tool_outputs
                        }
                    )

                    let str = ''

                    for await (const event of stream) {

                        console.log('event', event)
    
                        if(event.event === 'thread.message.delta') {
    
                            console.log('thread.message.delta', event.data.delta.content)
                            
                            // the value of str is not used in particular,
                            // just to determine if there is already text generated
                            str += event.data.delta.content[0].text.value

                            controller.enqueue(event.data.delta.content[0].text.value)
                        
                        } else if(event.event === 'thread.run.completed'){
    
                            console.log(event.data.status)

                            is_completed = true
    
                        } else if(event.event === 'thread.run.requires_action') {
                            if(event.data.status === 'requires_action') {
                                if(event.data.required_action && event.data.required_action.type === 'submit_tool_outputs') {
                                    
                                    run_id = event.data.id

                                    const tools_called = event.data.required_action.submit_tool_outputs.tool_calls
    
                                    console.log('tools-called', tools_called)
                                    
                                    tool_outputs = []

                                    tools_called.forEach((tool) => {

                                        const tool_name = tool.function.name
                                        const tool_args = JSON.parse(tool.function.arguments)

                                        const tool_output = mockAPI(tool_name, tool_args)

                                        tool_outputs.push({
                                            tool_call_id: tool.id,
                                            output: JSON.stringify(tool_output)
                                        })

                                    })

                                    console.log('tool-outputs', tool_outputs)

                                    break
    
                                }
                            }
                        }
    
                    }

                    if(str.length > 0 && !is_completed) {
                        // just adding newline if this is invoked,
                        // this is like showing, "please wait..."
                        controller.enqueue(JSON.stringify({ longwait: true }))
                    }

                    loop_count++

                }
                
                console.log('-- close streaming... --')

                controller.close()
                
            }
        }),
        { 
            status: 200, 
            headers: {
                'Content-Type': 'text/event-stream'
            } 
        }
    )

}