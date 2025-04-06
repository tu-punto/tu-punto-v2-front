import { useEffect, useState } from "react"
import { getGroupsAPI } from "../api/group"

interface Group {
    id: number,
    name: string
}
const useGroup = () => {
    const [groups, setData] = useState<Group[]>([])
    
    const fetchGroups = async () => {
        try {
            const res = await getGroupsAPI();
            setData(res.flat())
        } catch (error) {
            console.error(error, `Error al obtener los groups`);
            setData([])
        }
    }
    
    useEffect(() => {
        fetchGroups();
    }, [])
    return { groups, fetchGroups, setGroup: setData }
}

export default useGroup
