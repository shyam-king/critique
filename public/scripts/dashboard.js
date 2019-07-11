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

    $("#favouritesLinkButton").click(()=>{
        $("html, body").animate({scrollTop: $("#favouritesList").offset().top - 50}, "slow");
    });

    $("#watchListLinkButton").click(()=>{
        $("html, body").animate({scrollTop: $("#watchingList").offset().top - 150}, "slow");
    });

    $.ajax("topMovies", {
        method: "GET",
        success: (obj)=>{
            fillItemCards(obj, "topRatedMovieList");
        }
    });

    refreshFavourites();
    refreshWatchingList();
    refreshWatchedList();

    $("#search").click((ev)=>{
        let query = $("#searchQuery").val();
        $("#searchResults").hide();
        if (query.match(/^(tt)|(nm)|(co)|(ev)|(ch)|(ni)[0-9]+/)) {
            fillItemCards([query], "searchList", "searchresults-");
        }
        else {
            fillItemCardsAfterSearch(query, "searchList", 1);
        }
        $("#searchResults").show("fast");
        $("html, body").animate({ scrollTop: 0 }, "slow");
    });

    $("#logout").click(()=>{
        document.cookie = "token=; path=/";
        document.location = "login.html";
    });


    //favourite button controls
    $("#addfavourite").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/favourite`, {
            method: "POST",
            data: {
                value: "true"
            }
        });

        $("#addfavourite").hide();
        $("#removefavourite").show();

        refreshFavourites();
        postActivity(`Added ${$("#detail-title").html()} as a favourite.`);
    });

    $("#removefavourite").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/favourite`, {
            method: "POST",
            data: {
                value: "false"
            }
        });

        $("#addfavourite").show();
        $("#removefavourite").hide();
        refreshFavourites();
        postActivity(`Removed ${$("#detail-title").html()} from favourites.`);
    });

    //watchlist controls
    $("#addwatchlist").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/watchlist`, {
            method: "POST",
            data: {
                value: "watching"
            }
        });

        $("#removewatchlist").show();
        $("#addwatchlist").hide();

        postActivity(`Added ${$("#detail-title").html()} to watch list.`);
        refreshWatchingList();
    });

    $("#removewatchlist").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/watchlist`, {
            method: "POST",
            data: {
                value: "none"
            }
        });

        $("#removewatched").hide();
        $("#addwatched").show();
        $("#removewatchlist").hide();
        $("#addwatchlist").show();

        postActivity(`Removed ${$("#detail-title").html()} from watch list.`);
        refreshWatchingList();
        refreshWatchedList();
    });

    $("#addwatched").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/watchlist`, {
            method: "POST",
            data: {
                value: "watched"
            }
        });

        $("#addwatched").hide();
        $("#removewatched").show();
        $("#removewatchlist").hide();
        $("#addwatchlist").hide();
        postActivity(`Marked ${$("#detail-title").html()} as watched.`);
        refreshWatchingList();
        refreshWatchedList();
    });

    $("#removewatched").click(()=>{
        $.ajax(`status/${$("#detailedView").attr("data-imdbid")}/watchlist`, {
            method: "POST",
            data: {
                value: "watching"
            }
        });

        $("#removewatched").hide();
        $("#addwatched").show();
        $("#addwatchlist").show();
        postActivity(`Unmarked ${$("#detail-title").html()} as watched.`);
        refreshWatchingList();
        refreshWatchedList();
    });
});

function fillItemCards(obj, divId, prefix) {
    if (prefix == undefined)
        prefix = "";
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
<div class="col-sm-4 thumbnail showCard" id="${prefix}${element}" onclick="showDetails('${element}');">
    <h3>Title</h3>
    <img style="width: 200px; height:200px">
    <p><span class="label label-default">Type:</span>   <span id="${prefix}${element}-type"></span></p>
    <p><span class="label label-default">IMDb rating:</span>   <span id=${prefix}"${element}-imdbrating"></span></p>
    <p><span class="label label-default">Rated:</span>   <span id="${prefix}${element}-rated"></span></p>
    <p><span class="label label-default">Language:</span>   <span id="${prefix}${element}-lang"></span></p>
    <p><span class="label label-default">Plot:</span>   <span id="${prefix}${element}-plot"></span></p>
</div>
                `);

        $.ajax(`http://www.omdbapi.com/?apikey=4cca6a50&i=${element}`, {
            method: "GET",
            success: (obj) => {
                $(`#${prefix}${element} h3`).html(obj.Title + `  <span class=badge>${obj.Year}</span>`);
                if (obj.Poster != "N/A")
                    $(`#${prefix}${element} img`).attr("src", obj.Poster);
                else 
                    $(`#${prefix}${element} img`).attr("src", "res/image-not-available.jpg");
                $(`#${prefix}${element}-rated`).html(obj.Rated);
                $(`#${prefix}${element}-imdbrating`).html(obj.imdbRating);
                $(`#${prefix}${element}-lang`).html(obj.Language);
                $(`#${prefix}${element}-plot`).html(obj.Plot);
                $(`#${prefix}${element}-type`).html(obj.Type);
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
            else {
                $("#searchList").html(`<p>No search results. Either no match or query too vague.</p>`);
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

            //trailer
            $.ajax(`getTrailer/${obj.Title.replace(" ", "+")}`, {
                success: (obj)=>{
                    $("#detail-trailer").attr("src", obj);
                }
            });
            
            //set id to the div.data-imdbid
            $("#detailedView").attr("data-imdbid", id);

            //control the buttons
            //  fetch status from server and update
            $("#addwatchlist").hide();
            $("#addwatched").hide();
            $("#removewatched").hide();
            $("#removewatchlist").hide();
            $.ajax(`status/${id}/watchlist`, {
                success: (obj) => {
                    switch(obj) {
                        case "watching":
                            $("#removewatchlist").show();
                            $("#addwatched").show();
                            break;
                        case "watched":
                            $("#removewatched").show();
                            break;
                        default:
                            //none
                            $("#addwatchlist").show();
                            $("#addwatched").show();
                    }
                },
                error : (obj, error1, error2) => {
                    console.log("error");
                    //same as watchlist = 'none'
                    $.ajax(`status/${id}/watchlist`, {
                        method: "POST",
                        data: {
                            value: "none"
                        }
                    });
                    $("#addwatchlist").show();
                    $("#addwatched").show();
                }
            });
            
            //fetch favourite details from server and update
            $.ajax(`status/${id}/favourite`, {
                success: (obj)=>{
                    $("#addfavourite").hide();
                    $("#removefavourite").hide();

                    if (obj == "true") 
                        $("#removefavourite").show();
                    else 
                        $("#addfavourite").show();
                },
                error : () => {
                    $.ajax(`status/${id}/favourite`, {
                        method: "POST",
                        data: {
                            value: "false"
                        }
                    });

                    $("#addfavourite").show();
                    $("#removefavourite").hide();
                }
            });

            //show title
            $("#detailedView").show("slow");

            //scroll to title
            $("html, body").animate({ scrollTop: $("#detailedView").offset().top + 50}, "slow");
        }
    });
}

function refreshFavourites() {
    $.ajax("favourites",{
        success: (obj)=>{
            if (obj.length > 0) {
                $("#favouritesList p").hide();
                fillItemCards(obj, "favouritesList", "favourites-");
            }
            else {
                $("#favouritesList").html("<p>No favourites yet.</p>");
            }
        }
    });
}

function refreshWatchedList() {
    $.ajax("watchlist/watched", {
        success: (obj)=>{
            if (obj.length > 0) {
                $("#watchedList p").remove();
                fillItemCards(obj, "watchedList", "watched-");
            }
            else {
                $("#watchedList").html("<p>No shows added as watched yet.</p>");
            }
        }
    });
}

function refreshWatchingList() {
    $.ajax("watchlist/watching", {
        success: (obj)=>{
            if (obj.length > 0) {
                $("#watchingList p").remove();
                fillItemCards(obj, "watchingList", "watched-");
            }
            else {
                $("#watchingList").html("<p>No shows watching right now.</p>");
            }
        }
    });
}

function postActivity(content) {
    $.ajax("activity", {
        method: "POST",
        data: {content: content}
    });
}