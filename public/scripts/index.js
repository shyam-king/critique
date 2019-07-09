$(document).ready(()=>{
    //if token can be verified goto dashboard
    $.ajax("verifyToken",{
        method: "POST",
        success: () => {
            document.location = "dashboard.html";
        }
    });
});