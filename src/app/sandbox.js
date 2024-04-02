'use client'

import * as React from 'react'

import classes from './sandbox.module.css'

export default function Sandbox() {

    const [data, setData] = React.useState('')

    const handleClick = async () => {

        try {
            const response = await fetch(`/api/assistant/?id=${Date.now()}`)

            //const result = await response.json()
            //console.log(result)

            const reader = response.body.getReader()

            let is_completed = false

            while(!is_completed) {

                const { done, value } = await reader.read()

                if(done) {
                    is_completed = true
                    break
                }

                let delta = new TextDecoder().decode(value)

                setData((prev) => prev + delta)

            }

        } catch(e) {
            console.log(e.message)
        }

    }

    return (
        <div className={classes.container}>
            <div>
                <div>
                    <p className={classes.panel}>{ data }</p>
                </div>
                <div>
                    <button onClick={handleClick} className={classes.button}>Button A</button>
                </div>
            </div>
        </div>
    )
}