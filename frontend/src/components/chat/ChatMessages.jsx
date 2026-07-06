import MessageBubble from "./MessageBubble";

export default function ChatMessages({

    messages

}){

    return(

        <div className="messages">

            {

                messages.map(msg=>(

                    <MessageBubble

                        key={msg.id}

                        message={msg}

                    />

                ))

            }

        </div>

    )

}