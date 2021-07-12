import React, { useEffect, useState } from "react";
import {
  AgoraVideoPlayer,
  createClient,
  createMicrophoneAndCameraTracks,
  ClientConfig,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-react";

const config: ClientConfig = { 
  mode: "rtc", codec: "vp8",
};

declare const window: any;
const appId: string = "48570c28f63b4b4aba7fe0b2e444ba95"; //ENTER APP ID HERE
const token: string | null = "00648570c28f63b4b4aba7fe0b2e444ba95IACBK5cXeqU0zTbCzkCRyWqgqNIigVNYibX/ywiY1iBj/0/2OosAAAAAEAC4541oQVjtYAEAAQBBWO1g";

const App = () => {
  // const [inCall, setInCall] = useState(false);
  // const [channelName, setChannelName] = useState("");
  const [channelName, setChannelName] = useState("hackathon");
  const [inCall, setInCall] = useState(true);
  return (
    <div>
      {inCall ? (
        <VideoCall setInCall={setInCall} channelName={channelName} />
      ) : (
        <ChannelForm setInCall={setInCall} setChannelName={setChannelName} />
      )}
    </div>
  );
};

// the create methods in the wrapper return a hook
// the create method should be called outside the parent component
// this hook can be used the get the client/stream in any component
const useClient = createClient(config);
const useMicrophoneAndCameraTracks = createMicrophoneAndCameraTracks();

const VideoCall = (props: {
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
  channelName: string;
}) => {
  const { setInCall, channelName } = props;
  const [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [start, setStart] = useState<boolean>(false);
  // using the hook to get access to the client object
  const client = useClient();
  // ready is a state variable, which returns true when the local tracks are initialized, untill then tracks variable is null
  const { ready, tracks } = useMicrophoneAndCameraTracks();

  useEffect(() => {
    // function to initialise the SDK
    let init = async (name: string) => {
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log("subscribe success");
        if (mediaType === "video") {
          setUsers((prevUsers) => {
            return [...prevUsers, user];
          });
        }
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", (user, type) => {
        console.log("unpublished", user, type);
        if (type === "audio") {
          user.audioTrack?.stop();
        }
        if (type === "video") {
          setUsers((prevUsers) => {
            return prevUsers.filter((User) => User.uid !== user.uid);
          });
        }
      });

      client.on("user-left", (user) => {
        console.log("leaving", user);
        setUsers((prevUsers) => {
          return prevUsers.filter((User) => User.uid !== user.uid);
        });
      });

      await client.join(appId, name, token, null);
      if (tracks) await client.publish([tracks[0], tracks[1]]);
      setStart(true);

    };

    if (ready && tracks) {
      console.log("init ready");
      init(channelName);
    }

  }, [channelName, client, ready, tracks]);


  return (
    <div className="App">
      {start && tracks && <Videos users={users} tracks={tracks} />}
      {ready && tracks && (
        <Controls tracks={tracks} setStart={setStart} setInCall={setInCall} />
      )}
    </div>
  );
};

const Videos = (props: {
  users: IAgoraRTCRemoteUser[];
  tracks: [IMicrophoneAudioTrack, ICameraVideoTrack];
}) => {
  const { users, tracks } = props;

  return (
    <div>
      <div id="videos">
        {/* AgoraVideoPlayer component takes in the video track to render the stream,
            you can pass in other props that get passed to the rendered div */}
        <AgoraVideoPlayer style={{height: '100%', width: '100%'}} className='vid' videoTrack={tracks[1]} />
        {users.length > 0 &&
          users.map((user) => {
            if (user.videoTrack) {
              return (
                <AgoraVideoPlayer style={{height: '100%', width: '100%'}} className='vid' videoTrack={user.videoTrack} key={user.uid} />
              );
            } else return null;
          })}
      </div>
    </div>
  );
};

export const Controls = (props: {
  tracks: [IMicrophoneAudioTrack, ICameraVideoTrack];
  setStart: React.Dispatch<React.SetStateAction<boolean>>;
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const client = useClient();
  const { tracks, setStart, setInCall } = props;
  const [trackState, setTrackState] = useState({ video: true, audio: true });

  const mute = async (type: "audio" | "video") => {
    if (type === "audio") {
      await tracks[0].setEnabled(!trackState.audio);
      setTrackState((ps) => {
        return { ...ps, audio: !ps.audio };
      });
    } else if (type === "video") {
      await tracks[1].setEnabled(!trackState.video);
      setTrackState((ps) => {
        return { ...ps, video: !ps.video };
      });
    }
  };

  const leaveChannel = async () => {
    await client.leave();
    client.removeAllListeners();
    // we close the tracks to perform cleanup
    tracks[0].close();
    tracks[1].close();
    setStart(false);
    setInCall(false);
    window.closeWindow();
  };

  return (
    <div className="controls">
      <button className={`eng-control-btn ${trackState.audio ? "eng-audio-on" : "eng-audio-off"}`}
        onClick={() => mute("audio")}>
        {trackState.audio ? <img alt="external-images" src="https://img.icons8.com/material-sharp/24/000000/microphone.png"/> : <img alt="external-images" src="https://img.icons8.com/material/24/000000/no-microphone.png"/>}
      </button>
      <button className={`eng-control-btn ${trackState.video ? "eng-video-on" : "eng-video-off"}`}
        onClick={() => mute("video")}>
        {trackState.video ? <img alt="external-images" src="https://img.icons8.com/material-outlined/24/000000/video-call.png"/> : <img alt="external-images" src="https://img.icons8.com/material-outlined/24/000000/no-video.png"/>}
      </button>
      {<button className="eng-control-btn eng-controls-leave-btn" onClick={() => leaveChannel()}>
        <span style={{fontSize: '25px'}}>&times;</span>
      </button>}
    </div>
  );
};

const ChannelForm = (props: {
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
  setChannelName: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return null;
};

export default App;
