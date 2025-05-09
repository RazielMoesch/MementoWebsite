import "./HomePage.css"


const HomePage = () => {
    return (
    
        <div className="home-page-container">
            <h1>Memento Vision</h1>
            <h2>Forget Forgetting</h2>

            <div className="basic-container">

                <h3>Goals</h3>
                <p>Here at Momento, the goal is to create an experience for those suffering from memory issues, 
                    such as Dementia, a way to hold on to the memory of their loved ones longer. 
                    The first step in the plan is to create a pair of Facial Identification Glasses 
                    that leverage our brains ability to learn. The more certain-neurons activate the easier
                    it is for you to reactivate them. This is known as Neuro-Plasticity. The hope is that someone in
                    the early stages of dementia, through consistent and continous use of these glasses, will
                    be able to retain memory of the people they're talking to. </p>

            </div>

            <div className="basic-container">

                <h3>How it Started</h3>
                <p>This project all started in Sophomore year of High School. My STEM teacher tasks my group with this: 
                    "Come up with something that fixes an issue". It took a few days of brainstorming
                    and then there was an idea, an idea for a pair of glasses that show you who you're talking to. 
                    The problem was clear, not only were regular people susceptable to forgetting people,
                    but of course people with Dementia or Alzheimers would absoulutley benifit from this.
                </p>

            </div>

            <div className="basic-container">

                <h3>Arificial Intelligence</h3>
                <p>Facial Recognition is part of a subacategory of AI called Computer Vision. Computer Vision is a subcategory of Deep Learning. Deep Learning is a subcategory of Machine Learning. 
                    Machine Learning is a subcategory of the general term "AI". This applicaiton utilizes something call a CNN or Convolutional Neural Network. This is just one small component of a 237 
                    layer backbone for this model. What does that mean? there are 3 main stages of a facial recognition model. Extraction, Embedding, Comparison. Let's start with extraction. This includes 
                    those CNN's that we talked about. They go over the image in small sections (kernels) and extracting the features of each. The next step is embedding. This involves taking the 
                    extracted feautures and creating representations for a face. This embedding defines key traits for facial recognition, such as distances between facial features. This can be distance between the
                    eyes, size of nose, etc. The last step Comparison, involves taking two embeddings and applying the cosine similarity formula. This is a similarity score from -1 to 1 that determines how similar 
                    the embeddings for the faces are.
                </p>

            </div>
        </div>
    
    )
}

export default HomePage