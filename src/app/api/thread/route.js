import openai from '@/service/openai'

export async function POST(request) {

    let { thread_id } = await request.json()

    if (!thread_id) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    try {

        const response = await openai.beta.threads.del(thread_id)

        console.log(response)

        return new Response(JSON.stringify(response), {
            status: 200,
        })

    } catch(e) {

        console.log(e.message)

        return new Response(e.message, {
            status: 400,
        })
    }
    
}