export default function MessageBubble({message}){

    return(

        <div
            className={
                message.self
                ? "my-message"
                : "other-message"
            }
        >

            <div className="sender">

                {message.sender}

            </div>

            <div>

                {message.text}

            </div>

        </div>

    )

}