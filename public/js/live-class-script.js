document.addEventListener('DOMContentLoaded', () => {
    const presenterVideo = document.getElementById('presenterVideo');
    const statusMessage = document.getElementById('statusMessage');
    const toggleCameraBtn = document.getElementById('toggleCameraBtn');
    const toggleMicBtn = document.getElementById('toggleMicBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const audioContainer = document.getElementById('audioContainer');

    let localStream = null;
    let peerConnections = {};
    const socket = io();

    const iceServers = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    // --- Socket.IO Events ---
    socket.on('connect', () => {
        console.log('Connected with ID:', socket.id);
        socket.emit('join');
    });

    socket.on('peer-joined', async ({ peerId, isInitiator }) => {
        console.log(`Peer ${peerId} joined. Initiator: ${isInitiator}`);
        await createPeerConnection(peerId, isInitiator);
    });

    socket.on('peer-left', (peerId) => {
        console.log(`Peer ${peerId} left`);
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
    });

    socket.on('chat message', (data) => {
        const sender = data.senderId === socket.id ? 'شما' : 'همتا';
        appendChatMessage(`<strong>${sender}:</strong> ${data.message}`);
    });

    socket.on('webrtc_signal', async (data) => {
        const senderId = data.sender;
        if (!peerConnections[senderId]) {
            await createPeerConnection(senderId, false);
        }
        const pc = peerConnections[senderId];
        try {
            if (data.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                if (data.sdp.type === 'offer') {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('webrtc_signal', { sdp: pc.localDescription, target: senderId });
                }
            } else if (data.ice) {
                await pc.addIceCandidate(new RTCIceCandidate(data.ice));
            }
        } catch (err) {
            console.error('WebRTC signal error:', err);
        }
    });

    // --- WebRTC Functions ---
    async function createPeerConnection(peerId, isInitiator) {
        if (peerConnections[peerId]) return;

        const pc = new RTCPeerConnection(iceServers);
        peerConnections[peerId] = pc;

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.ontrack = (event) => {
            if (event.track.kind === 'audio') {
                const audioEl = createAudioElement(peerId);
                audioEl.srcObject = event.streams[0];
            } else if (event.track.kind === 'video') {
                // نمایش کل پنل برای ارائه‌دهنده
                presenterVideo.srcObject = event.streams[0];
                presenterVideo.style.display = 'block';
                statusMessage.style.display = 'none';
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_signal', { ice: event.candidate, target: peerId });
            }
        };

        pc.onnegotiationneeded = async () => {
            if (isInitiator && localStream) {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('webrtc_signal', { sdp: pc.localDescription, target: peerId });
                } catch (err) {
                    console.error('Error creating offer:', err);
                }
            }
        };
    }

    // --- UI & Helper Functions ---
    function createAudioElement(peerId) {
        let audioEl = document.getElementById(`audio-${peerId}`);
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${peerId}`;
            audioEl.autoplay = true;
            audioContainer.appendChild(audioEl);
        }
        return audioEl;
    }

    function toggleCamera() {
        if (!localStream) startLocalStream();
        else {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            toggleCameraBtn.classList.toggle('active', videoTrack.enabled);
        }
    }

    function toggleMic() {
        if (!localStream) startLocalStream();
        else {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            toggleMicBtn.classList.toggle('active', audioTrack.enabled);
        }
    }

    async function startLocalStream() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            presenterVideo.srcObject = localStream;
            presenterVideo.style.display = 'block';
            statusMessage.style.display = 'none';

            for (const peerId in peerConnections) {
                localStream.getTracks().forEach(track => {
                    peerConnections[peerId].addTrack(track, localStream);
                });
                peerConnections[peerId].onnegotiationneeded && peerConnections[peerId].onnegotiationneeded();
            }

            endCallBtn.style.display = 'inline-block';
        } catch (err) {
            console.error('Error accessing media:', err);
            statusMessage.textContent = 'دسترسی به وب‌کم یا میکروفون ممکن نیست';
        }
    }

    function endCall() {
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};
        if (localStream) localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        presenterVideo.srcObject = null;
        presenterVideo.style.display = 'none';
        statusMessage.textContent = 'تماس پایان یافت';
        statusMessage.style.display = 'block';
    }

    function appendChatMessage(msg) {
        const div = document.createElement('div');
        div.classList.add('chat-message');
        div.innerHTML = msg;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChatMessage() {
        const msg = chatInput.value.trim();
        if (msg) {
            socket.emit('chat message', msg);
            chatInput.value = '';
        }
    }

    // --- Event Listeners ---
    toggleCameraBtn.addEventListener('click', toggleCamera);
    toggleMicBtn.addEventListener('click', toggleMic);
    endCallBtn.addEventListener('click', endCall);
    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatMessage(); });
});
