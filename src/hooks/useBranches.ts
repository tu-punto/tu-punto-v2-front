import { useEffect, useState } from "react";
import { getSucursalsAPI } from "../api/sucursal";
import { getSellerAPI } from "../api/seller";
import { IBranch } from "../models/branchModel";
import { useUserRole } from "./useUserRole";

function useBranches() {
    const { user } = useUserRole();
    const [branches, setBranches] = useState<IBranch[]>([])
    const [activeBranches, setActiveBranches] = useState<IBranch[]>()

    const fetchBranches = async () => {
        const branchData = await getSucursalsAPI()
        const sellerData = await getSellerAPI(user.id_vendedor)
        if (!branchData || !sellerData) {
            console.log("Error al recuperar sucursales")
            return
        }
        setBranches(branchData)

        const paidData = sellerData.pago_sucursales
        const activeBranchIDs: Set<string> = new Set();
        const sellerFinalDate = new Date(sellerData.fecha_vigencia);
        paidData.forEach((branch: IBranch) => {
            if (isActiveSellerBranch(branch, sellerFinalDate)) {
                activeBranchIDs.add(branch.id_sucursal + "");
            }
        });

        const filteredBranches: IBranch[] = [];
        branches.forEach((branch: IBranch) => {
            if (branch._id && activeBranchIDs.has(branch._id)) {
                filteredBranches.push(branch);
            }
        })
        setActiveBranches(filteredBranches)
    }

    const isActiveSellerBranch = (branch: any, finalDate: Date) => {
        const actualDate = new Date();
        let branchFinalDate: Date;
        if (branch.fecha_salida) {
            branchFinalDate = new Date(branch.fecha_salida);
        } else {
            branchFinalDate = finalDate;
        }
        return branchFinalDate > actualDate
    }

    return {
        fetchBranches,
        branches,
        activeBranches,
    }
}

export default useBranches;