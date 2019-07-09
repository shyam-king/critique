$(document).ready(()=>{
    $("#errorMessage").hide();
    $("#successMessage").hide();

    $("#submit").click((ev)=>{
        $("#errorMessage").hide();
        $("#successMessage").hide();
        $.ajax("newuser", {
            method: "POST",
            data: {
                username: $("#username").val(),
                password: $("#password").val()
            },
            success: (data) => {
                $("#errorMessage").hide();
                $("#successMessage").show("fast");

            },
            error: (obj, status, error) => {
                let err = JSON.parse(obj.responseText);
                $("#successMessage").hide();
                $("#errorMessage").html(err.message.join("<br>"));
                $("#errorMessage").show("fast");
            }
        });
    });
});
