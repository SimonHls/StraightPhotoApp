import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Camera } from "expo-camera";
import { DeviceMotion } from "expo-sensors";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import Icon from "react-native-vector-icons/FontAwesome";

export default function App() {
  const [cameraRef, setCameraRef] = useState(null);
  const isCameraReady = useRef(true);
  const [isActivated, setIsActivated] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [rotationData, setRotationData] = useState({ beta: 0, gamma: 0 });
  const [rawRotationData, setRawRotationData] = useState({ beta: 0, gamma: 0 });
  const [rotationDataOffset, setRotationDataOffset] = useState({
    beta: 0,
    gamma: 0,
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // functions for the timed activate button
  const [timeoutId, setTimeoutId] = useState(null); // makes sure, that the three second delay is overwritten when the user presses the manual activate
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

// First useEffect for taking picture
useEffect(() => {
  let subscription;

  (async () => {
    const { status } = await DeviceMotion.requestPermissionsAsync();
    if (status === "granted" && isActivated) {
      subscription = DeviceMotion.addListener(async () => {
        const degreeTolerance = 0.1;

        if (
          !previewVisible &&
          isCameraReady.current &&
          cameraRef &&
          Math.abs(rotationData.beta) < degreeTolerance &&
          Math.abs(rotationData.gamma) < degreeTolerance
        ) {
          isCameraReady.current = false; // Lock the camera

          try {
            const { uri } = await cameraRef.takePictureAsync();
            vibrate(1, 250);
            setCapturedImage(uri);
            setPreviewVisible(true);
            setIsActivated(false);
            subscription && subscription.remove();

            isCameraReady.current = true; // Unlock the camera nach erfolgreicher Aufnahme
          } catch (error) {
            console.log("Kamera ist noch nicht bereit: ", error);
            isCameraReady.current = true; // Unlock the camera im Fehlerfall
          }
        }
      });
    }
  })();

  return () => {
    subscription && subscription.remove();
  };
}, [cameraRef, isActivated, rotationData]);


// Second useEffect for tracking device motion
// Update the Second useEffect for tracking device motion
useEffect(() => {
  let subscription;
  (async () => {
    const { status } = await DeviceMotion.requestPermissionsAsync();
    if (status === "granted") {
      subscription = DeviceMotion.addListener((deviceMotionData) => {
        const { rotation } = deviceMotionData;
        const { beta, gamma } = rotation || {};

        // Update raw sensor data
        setRawRotationData({ beta, gamma });

        // Apply calibration offset
        const betaOffsetted = beta - rotationDataOffset.beta;
        const gammaOffsetted = gamma - rotationDataOffset.gamma;

        // Update state with calibrated values
        setRotationData({ beta: betaOffsetted, gamma: gammaOffsetted });
      });
    }
  })();

  return () => {
    subscription && subscription.remove();
  };
}, [rotationDataOffset]);

// Update calibrate function
const calibrate = () => {
  setRotationDataOffset({ ...rawRotationData });
};



  const savePhoto = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === "granted") {
      const asset = await MediaLibrary.createAssetAsync(capturedImage);
      await MediaLibrary.createAlbumAsync("AppPhotos", asset, false);
    }
    setPreviewVisible(false);
    setCapturedImage(null);
  };

  const discardPhoto = () => {
    setPreviewVisible(false);
    setCapturedImage(null);
  };

  if (hasPermission === null) {
    return <Text>Warte auf Kameraberechtigung</Text>;
  }
  if (hasPermission === false) {
    return <Text>Kein Zugriff auf die Kamera</Text>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {previewVisible && capturedImage ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 50,
            marginTop: 40,
          }}
        >
          <View style={{ flex: 1, width: 300 }}>
            <Image
              source={{ uri: capturedImage }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          </View>
          <View
            style={{
              flex: 0.2,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={discardPhoto}
              style={[styles.button, styles.redButton]}
            >
              <Icon name="trash" size={35} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={savePhoto}
              style={[styles.button, styles.greenButton]}
            >
              {/* Save to file icon */}
              <Icon name="save" size={35} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Settings icon in top right corner superimposed on camera */}

          <Camera
            style={{
              flex: 1,
              margin: 10,
              marginTop: 50,
              justifyContent: "center",
              alignItems: "center",
            }}
            ref={(ref) => {
              setCameraRef(ref);
            }}
          >

            <Image
              source={require("./images/crosshair.png")}
              style={{ width: 20, height: 20 }}
            />
            <View style={styles.bottomOverlay}>
              <View style={styles.rotationDataTextWrapper}>
                <Text style={styles.rotationDataText}>
                  Beta: {rotationData.beta.toFixed(2)} Gamma: {rotationData.gamma.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  calibrate();
                }}
                style={styles.crosshairButton}
              >
                <Icon name="crosshairs" size={40} color="white" />
              </TouchableOpacity>
            </View>
          </Camera>
          <View style={styles.footerWrapper}>
            <View style={styles.activateButtonWrapper}>
              <TouchableOpacity
                style={[
                  styles.button,
                  isTimerActive
                    ? styles.yellowButton
                    : isActivated
                    ? styles.redButton
                    : styles.greenButton,
                ]}
                onPress={() => {
                  setIsTimerActive(true);
                  const id = setTimeout(() => {
                    setIsActivated(!isActivated);
                    setIsTimerActive(false);
                  }, 3000);
                  setTimeoutId(id);
                }}
              >
                <Text style={styles.buttonText}>3s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  isActivated ? styles.redButton : styles.greenButton,
                ]}
                onPress={() => {
                  if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    setTimeoutId(null);
                  }
                  setIsTimerActive(false);
                  setIsActivated(!isActivated);
                }}
              >
                <Text style={styles.buttonText}>
                  <Icon
                    name={isActivated ? "pause" : "play"}
                    size={35}
                    color="white"
                  />
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const vibrate = async (vibrations, delay) => {
  for (let i = 0; i < vibrations; i++) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const styles = StyleSheet.create({
  footerWrapper: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 25,
  },
  activateButtonWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    paddingBottom: 25,
  },
  rotationDataTextWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  button: {
    paddingHorizontal: 25,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
    height: 80,
    margin: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  crosshairButton: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: "center",
    margin: 5,
    maxWidth: 60,
    height: 60,
    borderRadius: 10,
    alignItems: "center",
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.6)', // translucent grey
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },  
  greenButton: {
    backgroundColor: "green",
  },
  redButton: {
    backgroundColor: "red",
  },
  yellowButton: {
    backgroundColor: "orange",
  },
  buttonText: {
    color: "white",
    fontSize: 40,
  },
  smallButtonText: {
    color: "white",
    fontSize: 20,
  },
  rotationDataText: {
    color: "white",
    fontSize: 18,
  },
  crosshair: {
    fontSize: 24,
    color: "lime",
    fontWeight: "bold",
  },
});
