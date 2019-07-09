$(document).ready(()=>{
    $("#errorMessage").hide();
    $("#submit").click(()=>{
        $("#errorMessage").hide();
        $.ajax("login", {
            method: "POST",
            data: {
                username: $("#username").val(),
                password: $("#password").val()
            },
            success: (data) => {
                document.location = "dashboard.html"
            },
            error: (obj) => {
                let err = JSON.parse(obj.responseText);
                $("#errorMessage").html(err.message.join("<br>"));
                $("#errorMessage").show("fast");
            }
        });
    });
});