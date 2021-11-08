<script>

	let event = "The Rolling Stones";
	let eventLocation = "Letzigrund Stadion, Zurich";
	let eventTag = "top event";
	let eventDescribtion =
		"The stones roll through Europe this winter - The Rolling Stones will play at the Letzigrund stadium on Friday, Dec 17 2021. On their “On Fire” tour, they will also make a stop in Zurich at the beginning of the winter... A heater and ticket prices are not yet known. We will inform you here and on social media. So check back from time to time.";
	let eventDate = "Fri 17. Dez";
	let eventTime = "18:00 PM";
</script>

<div class="contentContainer">
    <div class="eventLocation">{eventLocation}</div>
    <div class="eventTitle">
        {event}
        <div id="eventTag">{eventTag}</div>
    </div>

    <div class="wrapper">
        <div class="eventDescribtion">{eventDescribtion}</div>

        <div class="eventDetails">
            Event Date
            <div class="eventTime">
                {eventDate} &nbsp; | &nbsp; {eventTime}
            </div>
        </div>

        <div class="eventPhotoContainer" />
    </div>
</div>