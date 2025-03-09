const inputbox=document.getElementById('input-box');
const listcontain=document.getElementById('list');

// adding to-do list
function add(){
    //checking if input field is empty or not
    if (inputbox.value===''){
        alert('You must write something!');
    }

    else{
        let li=document.createElement('li'); //create <li> element
        li.innerHTML=inputbox.value; // set its text content
        listcontain.appendChild(li); // appending it to list

        //create span(delete button 'x')
        let span=document.createElement("span");
        span.innerHTML="\u00d7"; //'x' symbol for delete button
        li.appendChild(span); //appending delete button to list
    }
    inputbox.value="";  //clear input field
    savedata(); //saving updated list to localstorage
}

listcontain.addEventListener("click",function(e){
    if(e.target.tagName==="LI"){
        e.target.classList.toggle("checked"); //if clicked on task then toggle(checked or unchecked)
        savedata();
    }
    else if(e.target.tagName==="SPAN"){
        e.target.parentElement.remove(); // if clicked on 'x' then remove task from list
        savedata();
    }
},false);

// Listen for "Enter" key press to add a task
inputbox.addEventListener("keypress", function (e) {
    if (e.key === "Enter") { 
        add(); // Calls add() when Enter is pressed
    }
});
//saving the list under the key "data"
//task remain as it is after page refreshes
function savedata(){
    localStorage.setItem("data",listcontain.innerHTML);
}

//showing saved list 
function showdata(){
    listcontain.innerHTML=localStorage.getItem("data");
}
showdata();