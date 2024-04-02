
function sleep(time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
}

export async function GET(request) {

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('id')

    console.log(order_id)
    console.log(process.env.OPENAI_API_KEY)


    return new Response(
        new ReadableStream({
            async pull(controller) {

                try {

                    let is_completed = false
                    let count = 0

                    let text = 'dog. lazy the over jumps fox brown quick The'
                    let tokens = text.split(' ')

                    do {

                        controller.enqueue(`${tokens.pop()} `)

                        await sleep(100)

                        count++

                        if(count > 10) {
                            is_completed = true
                        }

                        if(tokens.length === 0) {
                            is_completed = true
                        }

                    } while(!is_completed)

                } catch(e) {
                    console.log(e.message)
                } finally {
                    controller.close()
                }

                
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