var parser = module.require("osuparser");
var format = module.require('format');

module.export("osu_to_lua", function(osu_file_contents) {
	var rtv_lua = ""
	var append_to_output = function(str, newline) {
		if (newline === undefined || newline === true)
		{
			rtv_lua += (str + "\n")
		}
		else
		{
			rtv_lua += (str)
		}
	}

	var beatmap = parser.parseContent(osu_file_contents)

	function track_time_hash(track,time) {
		return track + "_" + time
	}

	function hitobj_x_to_track_number(hitobj_x, lane) {
		var result = Math.floor(hitobj_x * lane / 512) + 1
		return result
	}

	function msToTime(s) {
		var ms = s % 1000;
		s = (s - ms) / 1000;
		var secs = s % 60;
		s = (s - secs) / 60;
		var mins = s % 60;
		var hrs = (s - mins) / 60;
		return hrs + ':' + mins + ':' + secs + '.' + ms;
	}

    var lane_number = beatmap.circleSize;

	var _tracks_next_open = {
		1 : -1,
		2: -1,
		3: -1,
		4: -1
	}
	var _i_to_removes = {}

	for (var i = 0; i < beatmap.hitObjects.length; i++) {
		var itr = beatmap.hitObjects[i];
		var type = itr.objectName;
		var track = hitobj_x_to_track_number(itr.position[0], lane_number);
		var start_time = itr.startTime

		if (_tracks_next_open[track] >= start_time) {

			append_to_output(format("--ERROR: Note overlapping another. At time (%s), track(%d). (Note type(%s) number(%d))",
				msToTime(start_time),
				track,
				type,
				i
			))

			_i_to_removes[i] = true
			continue
		} else {
			_tracks_next_open[track] = start_time
		}

		if (type == "slider") {
			var end_time = start_time + itr.duration
			if (_tracks_next_open[track] >= end_time) {
				append_to_output(format("--ERROR: Note overlapping another. At time (%s), track(%d). (Note type(%s) number(%d))",
					msToTime(start_time),
					track,
					type,
					i
				))

				_i_to_removes[i] = true
				continue
			} else {
				_tracks_next_open[track] = end_time
			}

		}
	}

	beatmap.hitObjects = beatmap.hitObjects.filter(function(x,i){
		return !(_i_to_removes[i])
	})

	append_to_output("local rtv = {}");
	append_to_output(format("rtv.%s = \"%s\"","AudioAssetId","rbxassetid://FILL_IN_AUDIO_ASSETID_HERE"));
	append_to_output(format("rtv.%s = \"%s\"","AudioFilename",beatmap.Title));
	append_to_output(format("rtv.%s = \"%s\"","AudioArtist",""));
	append_to_output(format("rtv.%s = \"%s\"","AudioDescription",""));
	append_to_output(format("rtv.%s = \"%s\"","AudioCoverImageAssetId","rbxassetid://FILL_IN_COVERART_TEXTURE_ASSETID_HERE"));
	
	append_to_output(format("rtv.%s = %d","AudioDifficulty",1));
	append_to_output(format("rtv.%s = %d","AudioTimeOffset",-75));
	append_to_output(format("rtv.%s = %d","AudioVolume",0.5));
	append_to_output(format("rtv.%s = %d","AudioNotePrebufferTime",1500));
        append_to_output(format("rtv.%s = %d","AudioLaneKey",lane_number))
	append_to_output(format("rtv.%s = %d","AudioHitSFXGroup",0));

	append_to_output("rtv.HitObjects = {}")
	append_to_output("local function note(time,track) rtv.HitObjects[#rtv.HitObjects+1]={Time=time;Type=1;Track=track;} end")
	append_to_output("local function hold(time,track,duration) rtv.HitObjects[#rtv.HitObjects+1] = {Time=time;Type=2;Track=track;Duration=duration;}  end")
	append_to_output("--")

	for (var i = 0; i < beatmap.hitObjects.length; i++) {
		var itr = beatmap.hitObjects[i];
		var type = itr.objectName;
		var track = hitobj_x_to_track_number(itr.position[0], lane_number);

		if (type == "slider") {
			append_to_output(format("hold(%d,%d,%d) ", itr.startTime, track, itr.duration))
		} else {
			append_to_output(format("note(%d,%d) ",itr.startTime, track))
		}
	}
	append_to_output("--")

	append_to_output("rtv.TimingPoints = {")
	for (var i = 0; i < beatmap.timingPoints.length; i++) {
		var itr = beatmap.timingPoints[i];
		if (itr.velocity) {
			append_to_output(format("\t[%d] = { Time = %d; Velocity = %d; };",i+1, itr.offset, itr.velocity))
		} else {
			append_to_output(format("\t[%d] = { Time = %d; BeatLength = %d; };",i+1, itr.offset, itr.beatLength))
		}
	}
	append_to_output("};")
	append_to_output("return rtv")

	return rtv_lua
})
