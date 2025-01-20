import { useForm } from "react-hook-form";
import { H2 } from "@shiksha/common-lib";
import { Button } from "native-base";
import { yupResolver } from "@hookform/resolvers/yup";
import studentAPI from "api/studentAPI";
import StudentSchema from "schema/StudentSchema";
import React, { useEffect, useState} from "react";
import axios from "axios";
import styles from "./StudentForm.module.css";
import { groupSearch, schoolSearch,getStateList,getBlockList,getDistrictList } from "routes/links";
import studentUpdateAPI from "api/studentUpdateAPI";

function StudentForm({ studentData }) {
  const [data, setData] = useState([]);
  const [token, setToken] = useState([]);
  const [selectedUdiseCode, setSelectedUdiseCode] = useState([]);
  const [extractedUdise, setextractedUdise] = useState("");
  const [extractedName, setextractedName] = useState("");
  const [selectedgroup, setSelectedgroup] = useState(""); // Initialize with an empty string

  const [groups, setGroups] = useState([]);
  const [stateData,setStateData] = useState([])
  const [districtData, setDistrictData] = useState([])
  const [blockData,setBlockData] = useState([])
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(""); 
  const [selectedBlock, setSelectedBlock] = useState(""); 
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(StudentSchema) });

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    setToken(token);
  }, []);

  useEffect(() => {
    if (studentData && data.length > 0) {
      const udiseCodeOnly = studentData?.schoolUdise;
  
      // Find the school in data by matching UDISE code
      const selectedSchool = data.find(school => school?.udiseCode === udiseCodeOnly);
  
      if (selectedSchool) {
        setSelectedUdiseCode(selectedSchool?.udiseCode); // Set the UDISE code only (not the combined string)
      }
  
      const selectedGroup = groups.find(group => group?.name === studentData?.className);
      if (selectedGroup) {
        setSelectedgroup(selectedGroup?.name);
      }

      if(studentData.state){
        setSelectedState(studentData?.state);
      }

      if(studentData.block){
        setSelectedBlock(studentData?.block)
      }

      if(studentData.district){
        setSelectedDistrict(studentData?.district)
      }
      
      // Set the other form data, like dateOfBirth
      const formattedDateOfBirth = studentData?.dateOfBirth?.split("T")[0];
      reset({
        ...studentData,
        dateOfBirth: formattedDateOfBirth,
      });
    }
  }, [studentData, data, groups, reset]);

  const MAX_RETRIES = 1;
  
  const retryApiCall = async (apiCall, retries = MAX_RETRIES) => {
    let attempt = 0;
    while (attempt < retries) {
      try {
        const response = await apiCall();
        return response;
      } catch (error) {
        if (error.response && error.response.status === 500) {
          attempt += 1;
          console.error(`Retrying API call... Attempt ${attempt}`);
          if (attempt >= retries) throw error; // Throw error after max retries
        } else {
          throw error;
        }
      }
    }
  };
  
  useEffect(() => {
    if (token && !studentData) {
      setLoading(true);
  
      const headers = {
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
  
      const requestDataSchool = { page: 0, filters: {} };
  
      const apiCalls = [
        () => axios.post(schoolSearch, requestDataSchool, { headers }),
        () => axios.post(getStateList, {}, { headers }),
      ];
  
      Promise.all(apiCalls.map(call => call()))
      .then(([schoolResponse, stateResponse]) => {
        if (schoolResponse) setData(schoolResponse.data.data);
        if (stateResponse) setStateData(stateResponse.data.data);
      })
      .catch(error => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
    }
  }, [token]);

  useEffect(() => {
    if (token && studentData) {
      setLoading(true);
  
      const headers = {
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
  
      const requestDataSchool = { page: 0, filters: {} };
      const requestDataDistrict = { state: studentData.state };
      const requestDataBlock = { district: studentData.district };
  
      const apiCalls = [
        () => axios.post(schoolSearch, requestDataSchool, { headers }),
        () => axios.post(getStateList, {}, { headers }),
        studentData.state
          ? () => axios.post(getDistrictList, requestDataDistrict, { headers })
          : null,
          studentData.district
          ? () => axios.post(getBlockList, requestDataBlock, { headers })
          : null,
      ].filter(Boolean);
  
      Promise.all(apiCalls.map((call) => retryApiCall(call)))
        .then(([schoolResponse, stateResponse, districtResponse, blockResponse]) => {
          if (schoolResponse) setData(schoolResponse.data.data);
          if (stateResponse) setStateData(stateResponse.data.data);
          if (districtResponse) setDistrictData(districtResponse.data.data);
          if (blockResponse) setBlockData(blockResponse.data.data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token,studentData]);

  //when change in state
  const handleStateChangeApi = (selectedState) => {
    if (token && selectedState) {
      const headers = {
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const requestData = { state: selectedState };
  
      axios.post(getDistrictList, requestData, { headers })
        .then((response) => {
          setDistrictData(response.data.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching district data:", error);
        });
    }
  };

  const handleDistrictChangeApi = (selectedDistrict) => {
    if (token && selectedDistrict) {
      const headers = {
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const requestData = { district: selectedDistrict };
      axios.post(getBlockList, requestData, { headers })
        .then((response) => {
          setBlockData(response.data.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching block data:", error);
        });
    }
  }
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    handleStateChangeApi(newState);
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
    handleDistrictChangeApi(newDistrict);
  };
  
  useEffect(() => {
    if(selectedUdiseCode.length > 0){
    if (Object.keys(selectedUdiseCode).length) {
      // Splitting string into an array using the comma
      const valuesArray = selectedUdiseCode.split(",");

      // Extracting and store the values in separate variables
      const udiseCode = valuesArray[0]; // "36220991573"

      setextractedUdise(udiseCode);
      const schoolName = valuesArray[1]; // "Gghs Hussaini Alam"
      setextractedName(schoolName);
      // Values in separate variables
    } else {
      console.error("selectedUdiseCode is not a string.");
    }}
  }, [selectedUdiseCode]);

  useEffect(async () => {
    if (extractedUdise && token) {
    const headers = {
      Accept: "*/*",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const requestData = {
      limit: 20,
      page: 0,
      filters: {
        schoolUdise: {
          eq: extractedUdise,
        },
      },
    };

    await axios
      .post(groupSearch, requestData, { headers })
      .then((response) => {
        setGroups(response.data.data);
      })
      .catch((error) => {
        // Handle any errors here
        console.error("Error fetching data:", error);
      });
    }
  }, [extractedUdise, token]);

  const onSubmit = async (data) => {
    try {
      if (studentData?.studentId) {
         // Update old student
         const result = await studentUpdateAPI(data);
         if (result === true) {
           alert("Updated Data Successful.");
           window.location.reload();
         } else {
           alert("Update failed");
         }
      } else {
        // Create new student
        const result = await studentAPI(data);
        if (result === true) {
          alert("Registration Successful.");
          window.location.reload();
        } else {
          alert("Registration failed");
        }
      }
    } catch (error) {
      console.error("Error saving student data:", error);
      alert("An error occurred while saving the data.");
    }
  };

  return (
    <div>
      {loading ? (
      <div className={styles.loader}>Loading...</div>
    ) : (
      <form
        className=" card-body form-floating mt-3 mx-1"
        autoComplete="off"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="mb-3">
          <div className="container mb-3">
            <div className={styles.formLabel} style={{ marginBottom: "10px" }}>
              <H2>
                {studentData ? "Edit Student Information" : "Interact with the requisite fields and execute a 'Submit' action  to preserve your alterations."}
              </H2>
            </div>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="name"
                id="name"
                placeholder="Student Name *"
                {...register("name")}
              ></input>
              {/* <label className="form-label" htmlFor="firstName">
                Name
              </label> */}
              <div className={styles.errorMessage}>
                {errors.name && <p>{errors.name.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="username"
                id="username"
                placeholder="User Name"
                {...register("username")}
              ></input>
              {/* <label className="form-label" htmlFor="userName">
                Username
              </label> */}
              <div className={styles.errorMessage}>
                {errors.username && <p>{errors.username.message}</p>}
              </div>
            </div>
            <br></br>
            <div className={styles.radiobutton}>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="gender"
                  id="gender"
                  value="Male"
                  defaultChecked={!studentData || studentData.gender === "Male"}  // default to male if no studentData
                  {...register("gender")}
                />
               <label className="form-check-label" htmlFor="male">
                  Male
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="gender"
                  id="gender"
                  value="Female"
                  defaultChecked={studentData?.gender === "Female"}  // default to female if studentData says so
                  {...register("gender")}
                />
                <label className="form-check-label" htmlFor="female">
                  Female
                </label>
              </div>
            </div>
            {/* <div className="form-floating">
              <input
                                className={styles.formControl}

                type="text"
                name="gender"
                id="gender"
                placeholder="Name of the content"
                {...register("gender")}
              ></input>
              <label className="form-label" htmlFor="gender">
                Gender
              </label>
              {errors.gender && <p>{errors.gender.message}</p>}
            </div> */}
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="date"
                name="dateOfBirth"
                id="dateOfBirth"
                placeholder="Date of Birth"
                {...register("dateOfBirth")}
              ></input>
              {/* <label className="form-label" htmlFor="dob">
                Date of Birth
              </label> */}
              <div className={styles.errorMessage}>
                {errors.dob && <p>{errors.dob.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="email"
                id="email"
                placeholder="E-mail"
                {...register("email")}
              ></input>
              {/* <label className="form-label" htmlFor="email">
                E-mail
              </label> */}
              <div className={styles.errorMessage}>
                {errors.email && <p>{errors.email.message}</p>}
              </div>
            </div>

            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="mobile"
                id="mobile"
                placeholder="Mobile"
                {...register("mobile")}
              ></input>
              {/* <label className="form-label" htmlFor="mobile">
                Mobile number
              </label> */}
              <div className={styles.errorMessage}>
                {errors.mobile && <p>{errors.mobile.message}</p>}
              </div>
            </div>
            <br></br>
            <div>
              {/* ... (previous form elements) */}
              <div className="form-floating">
                <select
                  className={styles.selectWrapper}
                  name="udise"
                  id="udise"
                  {...register("udise")}
                  value={selectedUdiseCode || ""} 
                  onChange={(e) => {
                    const selectedValue = e.target.value; 
                    setSelectedUdiseCode(selectedValue);
                  }}
                >
                  <option value="">Select School Udise</option>{" "}
                  {data.map((school) => (
                    <option
                     key={school.udiseCode}
                     value={school.udiseCode}>
                     {school.name} ({school.udiseCode})
                    </option>
                  ))}
                </select>
                {/* <label className="form-label" htmlFor="udise">
                  School Udise
                </label> */}
                <div className={styles.errorMessage}>
                  {errors.udise && <p>{errors.udise.message}</p>}
                </div>
              </div>
              {/* ... (more form elements) */}
            </div>
            <br></br>

            <div>
              {/* ... (previous form elements) */}
              <div className="form-floating">
                <select
                  className={styles.selectWrapper}
                  name="group"
                  id="group"
                  {...register("group")}
                  value={selectedgroup}
                  onChange={(e) => setSelectedgroup(e.target.value)}
                  disabled={studentData} // Disable the field in edit mode
                >
                  <option value="">Select Group</option>
                  {groups.map((school) => (
                    <option key={school.name} value={school.name}>
                      {school.name}
                    </option>
                  ))}
                </select>

                <div className={styles.errorMessage}>
                  {errors.group && <p>{errors.group.message}</p>}
                </div>
              </div>
              {/* ... (more form elements) */}
            </div>

            <br></br>
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="role"
                id="role"
                placeholder="Role"
                {...register("role")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.role && <p>{errors.role.message}</p>}
              </div>
            </div>
            <br></br> */}
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="board"
                id="board"
                placeholder="Board"
                {...register("board")}
              ></input>
              {/* <label className="form-label" htmlFor="board">
                Board
              </label> */}
              <div className={styles.errorMessage}>
                {errors.board && <p>{errors.board.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="password"
                id="password"
                placeholder="Password"
                {...register("password")}
              ></input>
              {/* <label className="form-label" htmlFor="password">
                Password
              </label> */}
              <div className={styles.errorMessage}>
                {errors.password && <p>{errors.password.message}</p>}
              </div>
            </div>
            <br></br>
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="grade"
                id="grade"
                placeholder="Grade"
                {...register("grade")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.grade && <p>{errors.grade.message}</p>}
              </div>
            </div>
            <br></br> */}
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="religion"
                id="religion"
                placeholder="Religion"
                {...register("religion")}
              ></input>
              {/* <label className="form-label" htmlFor="religion">
                Religion
              </label> */}
              <div className={styles.errorMessage}>
                {errors.religion && <p>{errors.religion.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="caste"
                id="caste"
                placeholder="Caste"
                {...register("caste")}
              ></input>
              {/* <label className="form-label" htmlFor="caste">
                Caste
              </label> */}
              <div className={styles.errorMessage}>
                {errors.caste && <p>{errors.caste.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="annualIncome"
                id="annualIncome"
                placeholder="Annual Income"
                {...register("annualIncome")}
              ></input>
              {/* <label className="form-label" htmlFor="annual">
                Annual Income
              </label> */}
              <div className={styles.errorMessage}>
                {errors.annual && <p>{errors.annual.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="motherEducation"
                id="motherEducation"
                placeholder="Mother Education"
                {...register("motherEducation")}
              ></input>
              {/* <label className="form-label" htmlFor="motherEducation">
                Mother Education
              </label> */}
              <div className={styles.errorMessage}>
                {errors.motherEducation && (
                  <p>{errors.motherEducation.message}</p>
                )}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="fatherEducation"
                id="fatherEducation"
                placeholder="Father Education"
                {...register("fatherEducation")}
              ></input>
              {/* <label className="form-label" htmlFor="fatherEducation">
                Father Education
              </label> */}
              <div className={styles.errorMessage}>
                {errors.fatherEducation && (
                  <p>{errors.fatherEducation.message}</p>
                )}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="motherOccupation"
                id="motherOccupation"
                placeholder="Mother Occupation"
                {...register("motherOccupation")}
              ></input>
              {/* <label className="form-label" htmlFor="motherOccupation">
                Mother Occupation
              </label> */}
              <div className={styles.errorMessage}>
                {errors.motherOccupation && (
                  <p>{errors.motherOccupation.message}</p>
                )}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="fatherOccupation"
                id="fatherOccupation"
                placeholder="Father Occupation"
                {...register("fatherOccupation")}
              ></input>
              {/* <label className="form-label" htmlFor="fatherOccupation">
                Father Occupation
              </label> */}
              <div className={styles.errorMessage}>
                {errors.fatherOccupation && (
                  <p>{errors.fatherOccupation.message}</p>
                )}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="noOfSiblings"
                id="noOfSiblings"
                placeholder="Number of Siblings"
                {...register("noOfSiblings")}
              ></input>
              {/* <label className="form-label" htmlFor="siblings">
                Number of Siblings
              </label> */}
              <div className={styles.errorMessage}>
                {errors.noOfSiblings && <p>{errors.noOfSiblings.message}</p>}
              </div>
            </div>
            <br></br>
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="studentEnrollId"
                id="studentEnrollId"
                placeholder="StudentEnrollId"
                {...register("studentEnrollId")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.studentEnrollId && (
                  <p>{errors.studentEnrollId.message}</p>
                )}
              </div>
            </div>
            <br></br> */}
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="uniqueId"
                id="uniqueId"
                placeholder="Unique ID"
                {...register("uniqueId")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.uniqueId && <p>{errors.uniqueId.message}</p>}
              </div>
            </div>
            <br></br> */}
            <div className="form-floating">
              <select
                className={styles.selectWrapper}
                name="state"
                id="state"
                value={selectedState || ""}  
                {...register("state")}
                onChange={handleStateChange}
              >
                <option value="">Select State</option>
                {stateData.map((state, index) => (
                  <option key={index} value={state.state}>
                    {state.state}
                  </option>
                ))}
              </select>
              <div className={styles.errorMessage}>
                {errors.state && <p>{errors.state.message}</p>}
              </div>
            </div>
            <br></br>
            <div className="form-floating">
              <select
                className={styles.selectWrapper}
                name="district"
                id="district"
                {...register("district")}
                value={selectedDistrict || ""}
                onChange={handleDistrictChange}
                disabled={!selectedState} 
              >
                <option value="">Select District</option>
                 {districtData.map((district, index) => (
                    <option key={index} value={district.district}>
                      {district.district}
                    </option>
                  ))}
              </select>

              <div className={styles.errorMessage}>
                {errors.district && <p>{errors.district.message}</p>}
              </div>
            </div>

            <br></br>
            <div className="form-floating">
              <select
                className={styles.selectWrapper}
                name="block"
                id="block"
                value={selectedBlock || ""}
                {...register("block")}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  setSelectedBlock(selectedValue); 
                  }}
                disabled={!selectedDistrict} 
              >
               <option value="">Select Block</option>
                 {blockData.map((block, index) => (
                    <option key={index} value={block.block}>
                      {block.block}
                    </option>
                  ))}
              </select>

              <div className={styles.errorMessage}>
                {errors.block && <p>{errors.block.message}</p>}
              </div>
            </div>
            <br></br>
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="section"
                id="section"
                placeholder="Section"
                {...register("section")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.section && <p>{errors.section.message}</p>}
              </div>
            </div>
            <br></br> */}
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="medium"
                id="medium"
                placeholder="Medium"
                {...register("medium")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.medium && <p>{errors.medium.message}</p>}
              </div>
            </div>
            <br></br> */}
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="bloodGroup"
                id="bloodGroup"
                placeholder="BloodGroup"
                {...register("bloodGroup")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.bloodGroup && <p>{errors.bloodGroup.message}</p>}
              </div>
            </div>

            <br></br> */}
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="status"
                id="status"
                placeholder="Status"
                {...register("status")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.status && <p>{errors.status.message}</p>}
              </div>
            </div>
            <br></br> */}
            {/* <div className="form-floating">
              <input
                className={styles.formControl}
                type="text"
                name="image"
                id="image"
                placeholder="Image"
                {...register("image")}
              ></input>
              <div className={styles.errorMessage}>
                {errors.image && <p>{errors.image.message}</p>}
              </div>
            </div> */}
          </div>
          <br />
          <Button type="button" onPress={handleSubmit(onSubmit)}>
            Submit
          </Button>
        </div>
      </form>
       )}
    </div>
  );
}

export default StudentForm;
