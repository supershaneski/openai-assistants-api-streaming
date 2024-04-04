openai-assistants-api-streaming
======

A sample application to demonstrate [OpenAI Assistants API streaming](https://platform.openai.com/docs/assistants/overview?context=with-streaming), built using [Next.js](https://nextjs.org/docs/getting-started/installation).


# Motivation

This project is designed to serve as a sandbox for testing the streaming capabilities of the OpenAI Assistants API.

When streaming was first introduced a few weeks ago, I struggle to find resources to make it work, especially when it came to function calling. I hope this will be of assistance to others who may be seeking to implement it in Node.js or Next.js, in particular.

A few notes, however. To simplify things, I will not be using the [Vercel AI SDK](https://sdk.vercel.ai/docs). Instead, I’ll be utilizing the [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) from the Streams API. Also, I will not be using the `createAndStream` SDK helper functions provided by OpenAI. I will opt for the generic functions for streaming.


# Streaming: Client-side

This is the basic code required to manage streaming on the client-side.

```javascript
// call our backend API
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

// setup stream reader
const reader = response.body.getReader()

let is_completed = false

// do polling
while(!is_completed) {

    const { done, value } = await reader.read()

    if(done) {
        // exit loop when done
        is_completed = true
        break
    }

    // convert value to string
    const delta = new TextDecoder().decode(value)

    // this is the text output...
    console.log(delta)

}
```


# Streaming: Backend

In this sample project, we will be utilizing existing Assistants that already have functions attached. We will also not be handling any `Retrieval` or `CodeInterpreter` tools.

First, we create a thread and add the message from the client-side. 

```javascript
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
```

It’s important to note that we will be sending the `thread_id` back to the client-side and will use this if it exists. If it doesn’t, we will create a new one.

Next, we set up a streaming response using the `ReadableStream`.

```javascript
return new Response(
        new ReadableStream({
            async pull(controller) {

                // send text to the client side using
                // controller.enqueue()
                
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
```

After setting it up, we initiate the run with streaming.

At first, if we only want a text response, we can disregard function calling.

```javascript
const stream = await openai.beta.threads.runs.create(
    thread_id,
    {
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
        stream: true
    }

for await (const event of stream) {

    if(event.event === 'thread.message.delta') {
        
        // send text response to the client side
        controller.enqueue(event.data.delta.content[0].text.value)
    
    }

}
```

Simple enough, right? Now, let’s add a function calling handler.

```javascript
let tool_outputs = []
let run_id

let stream = await openai.beta.threads.runs.create(
    thread_id,
    {
        assistant_id: process.env.OPENAI_ASSISTANT_ID,
        stream: true
    }

for await (const event of stream) {

    if(event.event === 'thread.message.delta') {
        
        // send text response to the client side
        controller.enqueue(event.data.delta.content[0].text.value)
    
    } else if(event.event === 'thread.run.requires_action') {
        if(event.data.status === 'requires_action') {
            if(event.data.required_action && event.data.required_action.type === 'submit_tool_outputs') {

                // save the run_id for submitToolOutputs call
                run_id = event.data.id

                const tools_called = event.data.required_action.submit_tool_outputs.tool_calls

                tools_called.forEach((tool) => {

                    const tool_name = tool.function.name
                    const tool_args = JSON.parse(tool.function.arguments)

                    // call your external API here to process your tools
                    const tool_output = { status: 'success' }

                    tool_outputs.push({
                        tool_call_id: tool.id,
                        output: JSON.stringify(tool_output)
                    })

                })

                console.log('tool-outputs', tool_outputs)

                // exit loop
                break

            }
        }
    }

}

// submit tools output
stream = openai.beta.threads.runs.submitToolOutputsStream(
        thread_id,
        run_id,
        {
            tool_outputs
        }
    )

for await (const event of stream) {

    if(event.event === 'thread.message.delta') {
        
        // send text response to the client side
        controller.enqueue(event.data.delta.content[0].text.value)
    
    }

}
```

This will handle a single function call. However, most of the time, functions will be called sequentially several times. As you may have already noticed, the code block handling the first run and the tools output submission is similar. This similarity allows us to unify it and place the handler inside a loop, letting it run until it completes its task. So, let’s rewrite our code:

```javascript
let tool_outputs = []
let is_completed = false
let run_id

while(!is_completed) {

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
    
    for await (const event of stream) {

        if(event.event === 'thread.message.delta') {

            // send text response to client-side
            controller.enqueue(event.data.delta.content[0].text.value)
        
        } else if(event.event === 'thread.run.completed'){

            // run is completed
            is_completed = true

        } else if(event.event === 'thread.run.requires_action') {
            if(event.data.status === 'requires_action') {
                if(event.data.required_action && event.data.required_action.type === 'submit_tool_outputs') {
                    
                    run_id = event.data.id

                    const tools_called = event.data.required_action.submit_tool_outputs.tool_calls

                    tool_outputs = []

                    tools_called.forEach((tool) => {

                        const tool_name = tool.function.name
                        const tool_args = JSON.parse(tool.function.arguments)

                        // call your external API here to process your tools
                        const tool_output = { status: 'success' }

                        tool_outputs.push({
                            tool_call_id: tool.id,
                            output: JSON.stringify(tool_output)
                        })

                    })

                    // exit the loop and submit the tools output
                    break

                }
            }
        }

    }

}
```

That’s it. This will handle parallel function calling and subsequent function calls.


# Setup

Clone the repository and install the dependencies

```sh
git clone https://github.com/supershaneski/openai-assistants-api-streaming.git myproject

cd myproject

npm install
```

Copy `.env.example` and rename it to `.env` then edit the `OPENAI_API_KEY` and `OPENAI_ASSISTANT_ID` with your own values.

```sh
OPENAI_API_KEY=YOUR_OWN_API_KEY
OPENAI_ASSISTANT_ID=YOUR_OWN_ASSISTANT_ID
```

To run the app

```sh
npm run dev
```

Open your browser to `http://localhost:3000/` to load the application page.
