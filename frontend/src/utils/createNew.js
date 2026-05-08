import socket from "../socket";
const createNewFile = () =>{
    const fileName = prompt("Enter the file name")
    if (!fileName) return;
    socket.emit("file:create",{ path: fileName })
}
const createNewFolder = () =>{
    const folderName = prompt("Enter the Folder name")
    if (!folderName) return;
    socket.emit("folder:create",{ path: folderName })
}


export {createNewFile, createNewFolder}
