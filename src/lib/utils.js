export const SimpleId = () => {
    return Date.now() + Math.random().toString(36).slice(2)
}

const trivia_list = [
    "Did you know that cats have a specialized collarbone, called the clavicle or 'collarbone'? Unlike humans, whose collarbones form a solid connection between the shoulder blades and the breastbone, a cat's collarbone is free-floating. This allows them to squeeze through tight spaces easily, as their collarbone can rotate and move independently. This ability is one reason why cats are such skilled climbers and can fit into surprisingly small spaces!",
    "Cats have a remarkable sense of balance, which is attributed to their inner ear structure and a specialized organ called the vestibular system. This system allows them to land on their feet after falling from heights. This ability is known as the 'righting reflex' or 'cat righting reflex'. Cats can reorient themselves mid-air by twisting their bodies, which helps them land on their feet, minimizing the impact of the fall. This unique trait is one of the reasons why cats are often associated with agility and grace.",
    "Cats have a special grooming behavior known as 'allogrooming' or 'social grooming'. This behavior involves cats grooming each other as a form of social bonding. Allogrooming is often seen in cats that are closely bonded, such as littermates or cats living in the same household. It serves several purposes, including strengthening social bonds, maintaining cleanliness, and even providing comfort and stress relief. This grooming behavior is a display of trust and affection among feline companions.",
    "Cats have a unique way of communicating with humans through a variety of vocalizations. While many people are familiar with the classic 'meow', cats actually have an extensive repertoire of sounds they use to communicate different messages. For example, chirps, trills, purrs, hisses, and yowls are all part of a cat's vocal repertoire, each serving different purposes. Cats may use meows to greet humans or ask for attention, purring often indicates contentment or relaxation, while hisses and growls are signals of fear or aggression. Understanding these vocalizations can help cat owners better interpret their feline companions' needs and emotions.",
]

const getDailyTrivia = (args) => {
    const index = Math.round((trivia_list.length - 1) * Math.random())
    return { ...args, message: `Here's a cat trivia for you:\n\n${trivia_list[index]}`}
}

const generateCatName = ({ theme = 'gender-neutral' }) => {

    const names = {
        'gender-neutral': ['Riley','Charlie','Pepper','Bailey','Sunny'],
        'playful': ['Whiskers','Sprinkles','Bubbles','Ziggy','Pixie'],
        'elegant': ['Luna','Sebastian','Duchess','Jasper','Aurora'],
        'nature-inspired': ['Willow','Leo','Ivy','River','Daisy'],
        'food-themed': ['Tofee','Mochi','Peanut','Olive','Cocoa'],
        'mythology': ['Athena','Apollo','Artemis','Loki','Freya'],
        'literary': ['Merlin','Luna','Gandalf','Hermione','Bilbo'],
        'history': ['Cleopatra','Leonardo','Mozart','Marie','Shakespeare'],
    }

    const index = Math.round((names[theme].length - 1) * Math.random())
    return { theme, name: `Here's a cat name for you:\n\n${names[theme][index]}`}
}

export const mockAPI = (name, args) => {

    console.log('mock-api', name, args)

    switch(name) {
        case 'get_daily_cat_trivia':
            return getDailyTrivia(args)
        case 'generate_cat_name':
            return generateCatName(args)
        default:
            return { status: 'error', message: 'tool not found' }
    }
}