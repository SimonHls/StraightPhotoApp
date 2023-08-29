import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import * as MediaLibrary from 'expo-media-library';

export default function App() {
  const [cameraRef, setCameraRef] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [rotationData, setRotationData] = useState({ beta: 0, gamma: 0 });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let subscription;
    let isTakingPicture = false;

    (async () => {
      const { status } = await DeviceMotion.requestPermissionsAsync();
      if (status === 'granted' && isActivated) {
        subscription = DeviceMotion.addListener(async (deviceMotionData) => {
          const { rotation } = deviceMotionData;
          const { beta, gamma } = rotation || {};
          setRotationData({ beta, gamma });

          const degreeTolerance = 0.1;
          if (
            !isTakingPicture &&
            cameraRef &&
            Math.abs(beta) < degreeTolerance &&
            Math.abs(gamma) < degreeTolerance
            ) {
              isTakingPicture = true;
              try {
                const { uri } = await cameraRef.takePictureAsync();
                setCapturedImage(uri);
                setPreviewVisible(true);
                setIsActivated(false);
                subscription && subscription.remove();
              } catch (error) {
                console.log("Kamera ist noch nicht bereit: ", error);
              }
              isTakingPicture = false;
            }
        });
      }
    })();

    return () => {
      subscription && subscription.remove();
    };
  }, [cameraRef, isActivated]);

  const savePhoto = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(capturedImage);
      await MediaLibrary.createAlbumAsync('AppPhotos', asset, false);
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
    <View style={{flex: 1, backgroundColor: 'black'}}>
      {previewVisible && capturedImage ? (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 50, marginTop: 40}}>
        <View style={{ flex: 1, width: 300}}>
          <Image source={{ uri: capturedImage }} style={{ flex: 1 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 0.2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>

          <TouchableOpacity onPress={discardPhoto} style={[styles.button, styles.redButton]}>
            <Text style={styles.smallButtonText}>Löschen</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={savePhoto} style={[styles.button, styles.greenButton]}>
            <Text style={styles.smallButtonText}>Behalten</Text>
          </TouchableOpacity>

        </View>
      </View>
    ) : (
      <View style={{ flex: 1 }}>
        <Camera
          style={{ flex: 1, margin: 10, marginTop: 50, justifyContent: 'center', alignItems: 'center' }}
          ref={(ref) => {
            setCameraRef(ref);
          }}
        >
          <Image source={require('./images/crosshair.png')} style={{width: 20, height: 20}} />
        </Camera>
        <View style={styles.footerWrapper}>
          <Text style={styles.rotationDataText}>
            Beta: {rotationData.beta.toFixed(2)} Gamma: {rotationData.gamma.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              isActivated ? styles.redButton : styles.greenButton
            ]}
            onPress={() => setIsActivated(!isActivated)}
          >
            <Text style={styles.buttonText}>Activate</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  footerWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 25
  },
  button: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 12,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  greenButton: {
    backgroundColor: 'green'
  },
  redButton: {
    backgroundColor: 'red'
  },
  buttonText: {
    color: 'white',
    fontSize: 40
  },
  smallButtonText: {
    color: 'white',
    fontSize: 20
  },
  rotationDataText: {
    color: 'white',
    fontSize: 18
  },
  crosshair: {
    fontSize: 24,
    color: 'lime',
    fontWeight: 'bold',
  }
});

