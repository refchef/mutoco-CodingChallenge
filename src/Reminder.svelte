<script>
    let days = 0;
    let addDay = () => (days += 1);
    let removeDay = () => (days -= 1);
</script>

<!-- Reminder Input Field -->
<div class="reminderContainer">
    <div class="reminder">
        Set a check back reminder

        <div id="submitForm">
            <div id="eventDate">DD.MM.YYYY</div>

            <div id="eventTime">13:00</div>

            <div id="daysToEvent">
                <button
                    id="minusDay"
                    onclick="decreaseValue()"
                    class="btn"
                    on:click={removeDay}>–</button
                >
                <div>in {days} Days</div>
                <button
                    id="plusDay"
                    onclick="increaseValue()"
                    class="btn"
                    on:click={addDay}>+</button
                >
            </div>

            <div class="wrapperInput">
                <input
                    class="inputField"
                    type="text"
                    name="email"
                    placeholder="Enter your email"
                    maxlength="50"
                    onkeyup="countChars(this);"
                    onclick="ValidateEmail(document.email)"
                />
                <span id="counter">50</span>
            </div>

            <input
                id="submitButton"
                type="submit"
                name="validate"
                value="Submit"
                >
        </div>
    </div>
    <script>
        let d = new Date();

        let day = d.getDate();
        let month = d.getMonth() + 1; 
        var year = d.getFullYear();

        let currentDate = day + "." + month + "." + year;
        document.getElementById("eventDate").innerHTML = currentDate;

        function ValidateEmail(input) {
            var validRegex =
                /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

            if (input.value.match(validRegex)) {
                alert("Valid email address!");

                document.email.focus();

                return true;
            } else {
                alert("Invalid email address!");

                document.email.focus();

                return false;
            }
        }

        console.log(currentDate);

        function countChars(obj) {
            var maxLength = 50;
            var strLength = obj.value.length;
            var charRemain = maxLength - strLength;

            if (charRemain < 0) {
                document.getElementById("counter").innerHTML =
                    '<span style="color: red;">You have exceeded the limit of ' +
                    maxLength +
                    " characters</span>";
            } else {
                document.getElementById("counter").innerHTML = charRemain;
            }
        }
    </script>
</div>
