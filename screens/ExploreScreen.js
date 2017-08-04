import React from 'react';
import {
  AsyncStorage,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { connect } from 'react-redux'
import { FontAwesome } from '@expo/vector-icons';
import ModalDropdown from 'react-native-modal-dropdown';
import { setCommunityIndex } from "../actions/communityActions"

import Colors from '../constants/Colors'

import { ExploreSectionListView } from './explore/ExploreSectionListView';
import FirebaseApp from '../firebase.config.js';
import * as FirebaseUtils from '../utilities/FirebaseUtils.js';
import Moment from 'moment'

const padding = 16
const dropdownHeight = 32



export const EventButton = (props) => {
  let testButton = (
  <TouchableOpacity onPress={() => props.navigation.navigate('Create', { name: 'Create'})}>
    <FontAwesome
      style={{margin:12}}
      name={'plus'}
      size={24}
      color={Colors.tabIconSelected}
    />
  </TouchableOpacity>)
  return testButton
}



///////////////////////////////////
// SCREEN STARTS HERE
@connect((store) => {
  return {
    communityIndex: store.community.index
  }
})
export default class ExploreScreen extends React.Component {

  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Explore',
      headerTintColor: "#000",
      headerRight: (
        <EventButton
          navigation={navigation}
        />
      ),
    };
  };


  constructor(props) {
    super(props)
    this.state = {
      communities: [],
      dataBlob: {},
      isLoadingDropdown: true,
      isLoadingListView: true
    }
    const {communityIndex} = props
    this.communityIndex = communityIndex
    this._setRefs(communityIndex)
  }

  componentDidMount() {
    console.log("componentDidMount -> _queryCommunities")
    this._queryCommunities()
    this._subscribeAll()
  }

  _refreshCommunity() {
    const {communityIndex} = this.props
    if (this.communityIndex != communityIndex) {
        this.communityIndex = communityIndex
        this._unsubscribeAll()
        this._setRefs(communityIndex)
        this._subscribeAll()
    }
  }

  _unsubscribeAll() {
    this.wapsRef.off()
  }

  _subscribeAll() {
    this._listenForWaps(this.wapsRef);
  }

  _setRefs(communityIndex) {
    this.wapsRef = FirebaseApp.database().ref(`waps/${communityIndex}`).orderByChild('timestamp').startAt(new Date().getTime())
  }

  _listenForWaps(wapsRef) {
    wapsRef.on('value', snap => {
      var val = FirebaseUtils.snapshotToArray(snap)
      var dataBlob = {}
      var offset = Platform.OS === 'ios' ? 0 : new Date().getTimezoneOffset()*60*1000
      // val.sort(function (a, b) {
      //   return a.createdAt - b.createdAt;
      // });
      val.forEach(x => {
        const key = Moment(x.timestamp+offset).format('LLLL')
        if (!dataBlob[key])
          dataBlob[key] = []
        dataBlob[key].push(x)
      })
      this.setState({dataBlob, isLoadingListView:false});
    });
  }

  _queryCommunities() {
    FirebaseApp.database().ref("communities").once('value').then(snap => {
      var snapArray = snap.val()
      //console.log(JSON.stringify(snapArray))
      var communities = snapArray.map(x => x.name)
      var isLoadingDropdown = false
      this.setState({communities, isLoadingDropdown}, () => {
        this.refs.modalDropdown.select(this.props.communityIndex)
        console.log("called select")
      })
    });
  }

  _onSelectCommunity(index, community) {
    this.setState({isLoadingListView:true}, () => { // HACK this state is useless but avoid doing async storage while already writing state
      AsyncStorage.setItem('communityIndex', index, () => {
        this.props.dispatch(setCommunityIndex(index))
      })
    })
  }

  render() {
    this._refreshCommunity()
    return (
      <View style={styles.container}>
        {this.state.isLoadingDropdown ? (
          <ActivityIndicator style={{height:dropdownHeight}} />
        ):(
          <ModalDropdown
            ref="modalDropdown"
            style={styles.dropdown}
            dropdownStyle={styles.dropdownStyle}
            textStyle={styles.textStyle}
            dropdownTextStyle={styles.dropdownTextStyle}
            options={this.state.communities}
            defaultValue="Choose your community ▼"
            onSelect={this._onSelectCommunity.bind(this)}
          />
        )}
        <ExploreSectionListView
          ref="listView"
          onPressRow={this._onPressRow}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          dataBlob={this.state.dataBlob}
          isLoading={this.state.isLoadingListView}
          />
      </View>
    );
  }

  _onPressRow = (row) => {
    // SHOULD PASS ROW
    this.props.navigation.navigate('Detail', {wap: row})
    //console.log("------------------------------")
    //console.log(JSON.stringify(row))
    //console.log("------------------------------")
  };

  _maybeRenderDevelopmentModeWarning() {
    if (__DEV__) {
      const learnMoreButton = (
        <Text onPress={this._handleLearnMorePress} style={styles.helpLinkText}>
          Learn more
        </Text>
      );

      return (
        <Text style={styles.developmentModeText}>
          Development mode is enabled, your app will run slightly slower but
          you have access to useful development tools. {learnMoreButton}.
        </Text>
      );
    } else {
      return (
        <Text style={styles.developmentModeText}>
          You are not in development mode, your app will run at full speed.
        </Text>
      );
    }
  }

  _handleLearnMorePress = () => {
    Linking.openURL(
      'https://docs.expo.io/versions/latest/guides/development-mode'
    );
  };

  _handleHelpPress = () => {
    Linking.openURL(
      'https://docs.expo.io/versions/latest/guides/up-and-running.html#can-t-see-your-changes'
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    //justifyContent: 'center',
  },
  developmentModeText: {
    marginBottom: 20,
    color: 'rgba(0,0,0,0.4)',
    fontSize: 15,
    textAlign: 'center',
  },
  contentContainer: {
    paddingTop: 80,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
  dropdown: {
    width: "100%",
    height: dropdownHeight,
    backgroundColor: Colors.sectionBackground,
    padding: 8
  },
  textStyle: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.tintColor,
  },
  dropdownTextStyle: {
    fontSize: 14,
  },
  dropdownStyle: {
    width: Dimensions.get('window').width - padding,
    //padding,
  }
});
