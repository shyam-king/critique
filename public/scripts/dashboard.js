$(document).ready(()=>{
    //verify token
    $.ajax("verifyToken", {
        method: "POST",
        error: (obj)=>{
            document.location = "login.html";
        },
    })

    $("#searchResults").hide();
    $("#detailedView").hide();

    $.ajax("topMovies", {
        method: "GET",
        success: (obj)=>{
            fillItemCards(obj, "topRatedMovieList");
        }
    });

    $("#search").click((ev)=>{
        let query = $("#searchQuery").val();
        $("#searchResults").hide();
        if (query.match(/^(tt)|(nm)|(co)|(ev)|(ch)|(ni)[0-9]+/)) {
            fillItemCards([query], "searchList");
        }
        else {
            fillItemCardsAfterSearch(query, "searchList", 1);
        }
        $("#searchResults").show("fast");
        $("html, body").animate({ scrollTop: $("#searchResults").offset().top + 50 }, "slow");
    });
});

function fillItemCards(obj, divId) {
    $(`#${divId}`).html("");
    let row = undefined;

    for (let i =0; i < obj.length; i++) {
        if (i%3 == 0) {
            row = document.createElement("div");
            $(row).addClass("row");
            $(row).addClass("row-eq-height");
        }

        let element = obj[i];

        $(row).append(`
<div class="col-sm-4 thumbnail showCard" id="${element}" onclick="showDetails('${element}');">
    <h3>Title</h3>
    <img style="width: 200px; height:200px">
    <p><span class="label label-default">Type:</span>   <span id="${element}-type"></span></p>
    <p><span class="label label-default">IMDb rating:</span>   <span id="${element}-imdbrating"></span></p>
    <p><span class="label label-default">Rated:</span>   <span id="${element}-rated"></span></p>
    <p><span class="label label-default">Language:</span>   <span id="${element}-lang"></span></p>
    <p><span class="label label-default">Plot:</span>   <span id="${element}-plot"></span></p>
</div>
                `);

        $.ajax(`http://www.omdbapi.com/?apikey=4cca6a50&i=${element}`, {
            method: "GET",
            success: (obj) => {
                $(`#${element} h3`).html(obj.Title + `  <span class=badge>${obj.Year}</span>`);
                if (obj.Poster != "N/A")
                    $(`#${element} img`).attr("src", obj.Poster);
                else 
                    $(`#${element} img`).attr("src", "res/image-not-available.jpg");
                $(`#${element}-rated`).html(obj.Rated);
                $(`#${element}-imdbrating`).html(obj.imdbRating);
                $(`#${element}-lang`).html(obj.Language);
                $(`#${element}-plot`).html(obj.Plot);
                $(`#${element}-type`).html(obj.Type);
            }
        });
        
        if (i%3 == 2) {
            $(`#${divId}`).append(row);
            row = undefined;
        }
    }

    if (row != undefined) {
        $(`#${divId}`).append(row);
    }
}

function fillItemCardsAfterSearch(query, divId, page) {
    $.ajax(`http://www.omdbapi.com/?apikey=4cca6a50&s=${query}&page=${page}`, {
        success: (obj) => {
            if (obj.Response == "True") {
                let nresponses = Number.parseInt(obj.totalResults);
                let npages = Math.ceil(nresponses / 10);

                let ids = [];
                obj.Search.forEach((element)=>{
                    ids.push(element.imdbID);
                });

                fillItemCards(ids, "searchList");
                let ul = document.createElement("ul");
                $(ul).addClass("pagination");
                for (let i = 0; i < npages; i++){
                    let item = "page-item";
                    if (i+1 == page) item += " active";
                    $(ul).append(`
                        <li class = "${item}">
                            <a class="page-link" href="#" onclick="fillItemCardsAfterSearch('${query}', 'searchList', ${i+1});">${i+1}</a>
                        </li>
                    `);
                }
                $("#searchList").append("<br>", ul);
            }
        }
    });
}

function showDetails(id) {
    $.ajax(`http://www.omdbapi.com/?apikey=4cca6a50&i=${id}`, {
        success: (obj)=>{

            //fill contents of title
            $("#detail-title").html(obj.Title);
            $(`#detailedView img`).attr("src", obj.Poster);
            $(`#detail-rated`).html(obj.Rated);
            $(`#detail-imdbrating`).html(obj.imdbRating);
            $(`#detail-lang`).html(obj.Language);
            $(`#detail-plot`).html(obj.Plot);
            $(`#detail-type`).html(obj.Type);
            $(`#detail-year`).html(obj.Year);
            $(`#detail-id`).html(id);
            $(`#detail-genre`).html(obj.Genre);
            $(`#detail-director`).html(obj.Director);
            $(`#detail-writer`).html(obj.Writer);
            $(`#detail-actors`).html(obj.Actors);
            $(`#detail-released`).html(obj.Released);
            $(`#detail-awards`).html(obj.Awards);
            if (obj.totalSeasons) {
                $("#detail-seasons").parent().show();
                $("#detail-seasons").html(obj.totalSeasons);
            }
            else 
                $("#detail-seasons").parent().hide();

            //show title
            $("#detailedView").show("slow");

            //scroll to title
            $("html, body").animate({ scrollTop: $("#detailedView").offset().top + 50}, "slow");
        }
    });
}