/* eslint-disable camelcase */
import * as actions from './actions'
import queryString from 'query-string'
import api from '../../utils/Api'
import GallerySchSample from '../../utils/GallerySchSample'
import { renderGalleryXML } from '../../components/SchematicEditor/Helper/ToolbarTools'
import { setTitle } from './index'
import { fetchLibrary, removeLibrary } from './schematicEditorActions'
import randomstring from 'randomstring'
import { fetchProject } from './projectActions'

export const setSchTitle = (title) => (dispatch) => {
  dispatch({
    type: actions.SET_SCH_TITLE,
    payload: {
      title: title
    }
  })
}

export const setSchDescription = (description) => (dispatch) => {
  dispatch({
    type: actions.SET_SCH_DESCRIPTION,
    payload: {
      description: description
    }
  })
}

export const setSchXmlData = (xmlData) => (dispatch) => {
  dispatch({
    type: actions.SET_SCH_XML_DATA,
    payload: {
      xmlData: xmlData
    }
  })
}

// Api call to save new schematic or updating saved schematic.
export const saveSchematic = (title, description, xml, base64, newBranch = false, branchName = null, setVersions, versions) => (dispatch, getState) => {
  var libraries = []
  getState().schematicEditorReducer.libraries.forEach(e => { libraries.push(e.id) })
  const project_id = getState().saveSchematicReducer.details.project_id
  var body = {
    data_dump: xml,
    base64_image: base64,
    name: title,
    description: description,
    esim_libraries: JSON.stringify([...libraries]),
    project_id: project_id
  }
  // Get token from localstorage
  const token = getState().authReducer.token
  const schSave = getState().saveSchematicReducer
  console.log(schSave)

  // add headers
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }

  // If token available add to headers
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  if (!newBranch) {
    console.log('New Version not Branch')
    body.version = randomstring.generate({
      length: 20
    })
    if (schSave.isSaved) {
      //  Updating saved schemaic
      body.save_id = schSave.details.save_id
      body.branch = schSave.details.branch
      api
        .post('save', queryString.stringify(body), config)
        .then((res) => {
          if (!res.data.duplicate) { setVersions(res.data.version, false, null) }
          dispatch({
            type: actions.SET_SCH_SAVED,
            payload: res.data
          })
        })
        .catch((err) => {
          console.error(err)
        })
    } else {
      body.branch = 'master'
      // saving new schematic
      api
        .post('save', queryString.stringify(body), config)
        .then((res) => {
          setVersions(res.data.version, true, res.data.save_id)
          dispatch({
            type: actions.SET_SCH_SAVED,
            payload: res.data
          })
        })
        .catch((err) => {
          console.error(err)
        })
    }
  } else {
    console.log('New Branch not Version')
    var flag = 0
    for (var i = 0; i < versions.length; i++) {
      if (branchName === versions[i][0]) { flag = 1 }
    }
    if (!flag) {
      body.save_id = schSave.details.save_id
      body.branch = branchName
      body.version = schSave.details.version
      api
        .post('save', queryString.stringify(body), config)
        .then((res) => {
          var temp = versions
          var d = new Date(res.data.save_time)
          res.data.date = d.getDate() + '/' + parseInt(d.getMonth() + 1) + '/' + d.getFullYear()
          res.data.time = d.getHours() + ':' + d.getMinutes()
          if (d.getMinutes() < 10) {
            res.data.time = d.getHours() + ':0' + d.getMinutes()
          }
          temp.push([res.data.branch, [res.data]])
          setVersions(temp)
          dispatch({
            type: actions.SET_SCH_SAVED,
            payload: res.data
          })
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }
}

// Action for Loading on-cloud saved schematics
export const fetchSchematic = (saveId, version, branch) => (dispatch, getState) => {
  // Get token from localstorage
  const token = getState().authReducer.token

  // add headers
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }

  // If token available add to headers
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  // console.log('Already Saved')
  api.get('save/' + saveId + '/' + version + '/' + branch, config)
    .then(
      (res) => {
        dispatch({
          type: actions.SET_SCH_SAVED,
          payload: res.data
        })
        dispatch(setSchTitle(res.data.name))
        dispatch(setSchDescription(res.data.description))
        dispatch(setSchXmlData(res.data.data_dump))
        if (res.data.project_id !== undefined) {
          dispatch(fetchProject())
        }
        renderGalleryXML(res.data.data_dump)
        if (res.data.esim_libraries.length > 0) {
          getState().schematicEditorReducer.libraries.forEach(e => dispatch(removeLibrary(e.id)))
          res.data.esim_libraries.forEach(e => dispatch(fetchLibrary(e.id)))
        }
      }
    )
    .catch((err) => { console.error(err) })
}

export const setSchShared = (share) => (dispatch, getState) => {
  // Get token from localstorage
  const token = getState().authReducer.token
  const schSave = getState().saveSchematicReducer

  // add headers
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // If token available add to headers
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  var isShared
  if (share === true) {
    isShared = 'on'
  } else {
    isShared = 'off'
  }

  api
    .post(
      'save/' + schSave.details.save_id + '/sharing/' + isShared + '/' + schSave.details.version + '/' + schSave.details.branch,
      {},
      config
    )
    .then((res) => {
      dispatch({
        type: actions.SET_SCH_SHARED,
        payload: res.data
      })
    })
    .catch((err) => {
      console.error(err)
    })
}

// Action for Loading Gallery schematics
export const loadGallery = (Id) => (dispatch, getState) => {
  var data = GallerySchSample[Id]

  dispatch({
    type: actions.LOAD_GALLERY,
    payload: data
  })
  dispatch(setTitle('* ' + data.name))
  dispatch(setSchTitle(data.name))
  dispatch(setSchDescription(data.description))
  dispatch(setSchXmlData(data.data_dump))
  renderGalleryXML(data.data_dump)
}

// Action for Loading local exported schematics
export const openLocalSch = (obj) => (dispatch, getState) => {
  var data = obj

  dispatch({ type: actions.CLEAR_DETAILS })
  dispatch(setTitle('* ' + data.title))
  dispatch(setSchTitle(data.title))
  dispatch(setSchDescription(data.description))
  dispatch(setSchXmlData(data.data_dump))
  renderGalleryXML(data.data_dump)
}

// Action for making a copy of a schematic
export const makeCopy = (saveID) => (dispatch, getState) => {
  const token = getState().authReducer.token

  // add headers
  const config = {
    headers: {
      'Content-Type': 'application/json'
    }
  }
  // If token available add to headers
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  api.post(`/save/copy/${saveID}`, {}, config)
    .then(res => {
      const win = window.open()
      win.location.href = '/eda/#/editor?id=' + res.data.save_id
      win.focus()
    })
    .catch(error => console.log(error))
}
