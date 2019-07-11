var myprofile;

$(document).ready(()=>{
    $.ajax("verifyToken", {
        method: "POST",
        error: (obj)=>{
            document.location = "login.html";
        },
    });

    //get user profile and populate
    $.ajax("/profile", {
        success: (obj) => {
            populateProfile(obj, "profile-");
        }
    });

    $("#editprofile").hide();

    $("#editprofilebutton").click(()=>{
        //get user profile and populate
        $.ajax("/profile", {
            success: (obj) => {
                myprofile = [];
                populateProfile(obj, "editprofile-");
                $("#editprofile").show("fast");
                $("html, body").animate({scrollTop: $("#editprofile").offset().top}, "slow");
            }
        });
    });

    $("#editprofile-add").click(()=>{
        let field = $("#editprofile-field").val();
        let content = $("#editprofile-content").val();

        if (field == "") {
            alert("Field cannot be empty!");
        }
        else {
            myprofile.push({field: field, content: content});
            $("#editprofile-field").val("");
            $("#editprofile-content").val("");
            populateProfile([{field: field, content: content, tag: "none"}], "editprofile-")
            $("html, body").animate({scrollTop: $("#editprofile-field").offset().top}, "slow");
        }
    });

    $("#editprofile-submit").click(()=>{
        $.ajax("updateProfile", {
            method: "POST",
            data: {profile: myprofile},
            success: () => {
                document.location = "profile.html";
            },
            error: ()=>{
                console.log("error");
            }
        });
    });

    //get activity and populate it
    $.ajax("activity", {
        success: (obj)=>{
            populateActivity(obj, "profile-");
        }
    });

    $("#logout").click(()=>{
        document.cookie = "token=; path=/";
        document.location = "login.html";
    });

    $("#search").click(()=>{
        let q = $("#searchQuery").val();
        $.ajax(`profile/${q}`, {
            success: (obj) => {
                $("#title").html(`${q}'s profile`);
                $("#searchQuery").parent().removeClass("has-error");
                $("#editprofilebutton").hide();
                $("#editprofilepicbutton").hide();
                populateProfile(obj, "profile-", false);
                $.ajax(`activity/${q}`, {
                    success: (obj2) => {
                        populateActivity(obj2, "profile-");
                    }
                });
                
            },
            error: () => {
                $("#searchQuery").parent().addClass("has-error");
            }
        }); 
    });

    $("#editprofilepic-form").hide();

    $("#editprofilepicbutton").click(()=>{
        $("#editprofilepic-form").show("slow");
    });
});

function populateProfile(profile, idprefix, app=true) {
    if (idprefix == undefined) 
        idprefix = "profile-";
    
    if (!app) {
        $(`#${idprefix}table .${idprefix}profileitem`).remove();
    }

    profile.forEach((element)=>{
        if (element.tag != 'none') {
            if (element.tag.search(/pic$/i) >= 0)
                $(`#${idprefix}${element.tag}`).attr("src", element.content);
            else
                $(`#${idprefix}${element.tag}`).html(element.content);
        }

        if (element.tag.search(/pic$/i) < 0) {
            $(`#${idprefix}table tbody`).append(`
            <tr class="${idprefix}profileitem">
                <td class="text-uppercase">${element.field}</td>
                <td>${element.content}</td>
            <tr>
            `);
        }
    });
}

function populateActivity(activities, idprefix) {
    $(`#${idprefix}activities ul`).html("");
    activities.forEach((element)=>{
        $(`#${idprefix}activities ul`).append(`
            <li class="list-group-item">${element.activity}</li>
        `);
    });
}