import openai from '@/service/openai';

export async function POST(request) {
    const { message } = await request.json();
    const triggerPhrase = "Update Instructions";
    
    const triggerIndex = message.indexOf(triggerPhrase);
    if (triggerIndex === -1) {
        return new Response('No instruction update trigger found in the message.', {
            status: 200,
        });
    }

    const newInstructionsText = message.substring(triggerIndex + triggerPhrase.length).trim();

    try {
        // Retrieve the current assistant's details
        const assistant = await openai.beta.assistants.retrieve('asst_GYt6AEfZaBa0Y3UqrfltgBtk');
        const currentInstructions = assistant.instructions || "";

        // Append the new instructions to the existing ones
        const updatedInstructions = `${currentInstructions}\n${newInstructionsText}`;

        // Update the assistant with the appended instructions
        const response = await openai.beta.assistants.update('asst_GYt6AEfZaBa0Y3UqrfltgBtk', {
            instructions: updatedInstructions
        });

        return new Response(JSON.stringify({
            status: 'success',
            updatedInstructions
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (e) {
        console.error(e);
        return new Response('Error updating assistant instructions.', {
            status: 500,
        });
    }
}
