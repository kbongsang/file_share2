using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Plumbing;
using Autodesk.Revit.DB.Mechanical;

namespace srai_addin
{
    // 부재 생성 클래스
    public class Element_create
    {
        public JObject JsonObj;
        public string Category_name;
        public Document Doc;

        public Element_create(JObject jsonObj_input, string category_name, Document doc)
        {
            this.JsonObj = jsonObj_input;
            this.Category_name = category_name;
            this.Doc = doc;
        }

        // 부재 생성 메소드
        public void Create_element()
        {
            string Connector_Category = null;

            if (Category_name == "Pipes")
                Connector_Category = "Pipe Fittings";
            else if (Category_name == "Ducts")
                Connector_Category = "Duct Fittings";

            // 시스템 네임 종류 수집 (즉, 함께 연결된 배관들은 같은 시스템 네임 파라미터 값을 가져야 함.)
            // Revit에서 모델링 하는 경우에도 연결된 배관들은 같은 시스템 네임을 공유하고 있으며,
            // 한번에 그렸다 하더라도 중간에 끊어서 모델링 하는 경우 자동으로 다음 인덱스가 뒤에 붙어서 시스템 네임으로 들어옴
            IEnumerable<JToken> System_Name_Collector = JsonObj["elements"].Where(e => (string)e["meta"]["Category"] == Category_name && e["meta"]["Family"] != null && e["meta"]["SystemName"] != null && (string)e["meta"]["SystemName"] != "");

            HashSet<string> System_Names = new HashSet<string>();
            foreach (var element in System_Name_Collector)
            {
                JObject Metadata_Category = (JObject)element["meta"];
                System_Names.Add((string)Metadata_Category["SystemName"]);
            }

            //시스템 별 파이프 생성
            foreach (var System_Name in System_Names)
            {
                List<Connector> Element_Connector_Set = new List<Connector>(); //먼저 파이프를 생성하면서 각 파이프의 커넥터도 함께 생성해서 해당 리스트에 저장

                IEnumerable<JToken> element_set = JsonObj["elements"].Where(e => (string)e["meta"]["Category"] == Category_name && e["location"]["startPoint"] != null && (string)e["meta"]["SystemName"] == System_Name);

                foreach (JToken element in element_set)
                {
                    // 모델링에 필요한 기본 설정
                    Level level = new FilteredElementCollector(Doc).OfClass(typeof(Level)).First() as Level;

                    // 시작점 좌표
                    JObject Start_Point = (JObject)element["location"]["startPoint"];
                    double Start_X = (double)Start_Point["x"];
                    double Start_Y = (double)Start_Point["y"];
                    double Start_Z = (double)Start_Point["z"];

                    // 끝점 좌표
                    JObject End_Point = (JObject)element["location"]["endPoint"];
                    double End_X = (double)End_Point["x"];
                    double End_Y = (double)End_Point["y"];
                    double End_Z = (double)End_Point["z"];

                    //레빗 공간 좌표로 선언, 단위 변경
                    var Curve_start = new XYZ(Start_X, Start_Y, Start_Z) / 3.048;
                    var Curve_end = new XYZ(End_X, End_Y, End_Z) / 3.048;

                    // 원하는 유형 찾기
                    FilteredElementCollector sysCollector = new FilteredElementCollector(Doc);
                    ElementType desired_Type = null;
                    ElementId SysTypeId = null;
                    FilteredElementCollector TypeCollector = null;
                    JObject Metadata_Category = (JObject)element["meta"];
                    string Type_category = (string)Metadata_Category["Type"];

                    if (Category_name == "Pipes")
                    {
                        sysCollector.OfClass(typeof(PipingSystemType));
                        SysTypeId = sysCollector.FirstElementId();
                        TypeCollector = new FilteredElementCollector(Doc).OfClass(typeof(PipeType));

                        foreach (PipeType Type_Col in TypeCollector.Cast<PipeType>())
                        {
                            if (Type_Col.Name == Type_category)
                            {
                                desired_Type = Type_Col;
                                break;
                            }
                        }
                    }
                    else if (Category_name == "Ducts")
                    {
                        sysCollector.OfClass(typeof(MechanicalSystemType));
                        SysTypeId = sysCollector.FirstElementId();
                        TypeCollector = new FilteredElementCollector(Doc).OfClass(typeof(DuctType));

                        foreach (DuctType Type_Col in TypeCollector.Cast<DuctType>())
                        {
                            if (Type_Col.Name == Type_category)
                            {
                                desired_Type = Type_Col;
                                break;
                            }
                        }
                    }

                    if (Curve_start.DistanceTo(Curve_end) > 0.1)
                    {
                        //트렌젝션 시작
                        using (Transaction trans_main = new Transaction(Doc, "Create " + Category_name))
                        {
                            trans_main.Start();

                            // 객체 생성
                            Element created_element = null;
                            if (Category_name == "Pipes")
                            {
                                Pipe created_element_pipe = Pipe.Create(Doc, SysTypeId, desired_Type.Id, level.Id, Curve_start, Curve_end);
                                ConnectorSet pipe_connectors = created_element_pipe.ConnectorManager.Connectors;

                                // ConnectorSet으로 생성할 경우 Connector 두개가 묶여 있음, 이후 Connector 생성 과정에서 사용할 수 있도록 각각 꺼내서 리스트에 저장
                                foreach (Connector connector in pipe_connectors)
                                {
                                    Element_Connector_Set.Add(connector);
                                }
                                created_element = created_element_pipe;
                            }

                            else if (Category_name == "Ducts")
                            {
                                Duct created_element_duct = Duct.Create(Doc, SysTypeId, desired_Type.Id, level.Id, Curve_start, Curve_end);
                                ConnectorSet duct_connectors = created_element_duct.ConnectorManager.Connectors;
                                foreach (Connector connector in duct_connectors)
                                {
                                    Element_Connector_Set.Add(connector);
                                }
                                created_element = created_element_duct;
                            }

                            // 파라미터 변경 (같은 패밀리와 타입으로 생성해도, 기존 모델의 파라미터와 차이가 있는 경우가 있음
                            // - 예시로, 레빗 샘플 프로젝트 화장실 파이프 부분에서 GUI로 모델링 해도 기존에 있던 파이프와 새로 만든 파이프의 파라미터 키 종류가 다름)
                            // 이는 패밀리에서 파라미터가 인스턴스로 설정되어 있는 경우인데, 같은 패밀리라도 파라미터가 패밀리 종속이 아닌
                            // 인스턴스 형식이면, 인스턴스를 형성한 뒤 프로젝트에서 파라미터 수정이 가능함.
                            var Created_element_parameterValues = new List<string>();
                            foreach (Parameter parameter in created_element.Parameters)
                                Created_element_parameterValues.Add(parameter.Definition.Name);
                            List<string> Metadata_keys = GetAllKeys(Metadata_Category);
                            var Common_parameter = Metadata_keys.Intersect(Created_element_parameterValues).ToList();

                            // 파라미터 세팅
                            foreach (string key_parameter in Common_parameter)
                            {
                                // 반드시 설정해야 하는 공통 파라미터, 그외의 파라미터는 읽기 전용이기 때문에 오류가 발생할 수 있음.
                                // 또한, Height와 같은 파라미터를 다시 세팅할 경우 위치가 바뀔 수 있기 때문에 위치를 결정하는 파라미터를 세팅을 하지 않음.
                                // 시스템 네임을 해당 코드에서 업데이트 해도 실제 생성된 것은 다른데, 이는 연결 
                                if (key_parameter == "Size" || key_parameter == "Diameter" || key_parameter == "Width" || key_parameter == "Height"
                                    || key_parameter == "SystemType" || key_parameter == "PipeSegment") //시스템 타입 들어가게 바꾸기 - 오류는 발생하지 않으나, 현재 방법으로 들어가지 않음.
                                {
                                    var parameter_value_string = (string)Metadata_Category[key_parameter];
                                    Parameter Parameter_set = created_element.LookupParameter(key_parameter);
                                    Parameter_set.SetValueString(parameter_value_string);
                                }

                                //레벨의 경우 특수하게 string을 바로 넣는 것으로 세팅이 되지 않아, 레벨을 찾고 다시 설정해야 함.
                                else if (key_parameter == "ReferenceLevel")
                                {
                                    var parameter_value_string = (string)Metadata_Category[key_parameter];
                                    Parameter Parameter_set = created_element.LookupParameter(key_parameter);
                                    string parameter_value_checked = (string)parameter_value_string;
                                    Level Reference_level = GetLevelByName(Doc, parameter_value_checked);

                                    if (Reference_level != null)
                                        Parameter_set.Set(Reference_level.Id);
                                    else
                                        continue;
                                }
                            }
                            trans_main.Commit();
                        }
                    }

                    
                }

                // 커넥터 생성
                // 커넥터의 경우 파라미터 설정이 위와 다르게 없음. 그 이유는 현재 같은 레빗 프로젝트(패밀리와 라우팅이 동일하게 설정되어 있는 파일)에 Import하기 때문에, 파이프 생성 시 패밀리와 타입을 설정하는 순간 해당 패밀리에 맞는 라우팅도 자동으로 지정됨.
                IEnumerable<JToken> Connector_set = JsonObj["elements"].Where(e => (string)e["meta"]["Category"] == Connector_Category && e["location"]["origin"] != null && (string)e["meta"]["SystemName"] == System_Name);

                foreach (JToken connector in Connector_set)
                {
                    Level level = new FilteredElementCollector(Doc).OfClass(typeof(Level)).First() as Level;
                    FilteredElementCollector sysCollector = new FilteredElementCollector(Doc);

                    JObject Metadata_Category = (JObject)connector["meta"];
                    string Family_string = (string)Metadata_Category["Family"];

                    JObject Location_Point = (JObject)connector["location"]["origin"];
                    double Location_X = (double)Location_Point["x"];
                    double Location_Y = (double)Location_Point["y"];
                    double Location_Z = (double)Location_Point["z"];

                    var Curve_Location = new XYZ(Location_X, Location_Y, Location_Z) / 3.048;

                    using (Transaction trans_main = new Transaction(Doc, "Create " + Connector_Category))
                    {
                        trans_main.Start();

                        // 피팅 생성
                        // 현재 피팅을 생성하는 방식은 피팅 인스턴스가 커넥터에 모두 연결이 된 전제가 있어야 생성 가능
                        // 독립적으로 모델링이 되어 있거나, 한쪽만 연결되어 있는 경우 피팅이 생성되지 않음.
                        // 코드는 정상적으로 실행되나 간혹 엘보우가 생성되지 않은 경우는 시스템 네임 파라미터가 들어가있는지 반드시 확인.
                        try
                        {
                            if (Family_string.Contains("Elbow") || Family_string.Contains("Bend") || Family_string.Contains("엘보")
                                || Family_string.Contains("Transaction") || Family_string.Contains("변환")) // 샘플 프로젝트의 일부 Elbow 이름이 Bend로 되어있는 경우가 존재, 이는 추후 Elbow를 일반적으로 잡는 코드로 업데이트 예정
                            {
                                // 피팅의 좌표에서 가장 가까운 두 커넥터를 가져옴
                                (Connector con1, Connector con2, var con_3, var con_4) = GetClosestConnectors(Element_Connector_Set, Curve_Location);
                                                               
                                if (con_3 != null)
                                {
                                    var threshhold = con_3.Origin.DistanceTo(Curve_Location);
                                    
                                    if (threshhold > 0.35) //안정적인 피팅 생성을 위한 경계값, 최소 길이 파라미터가 적용될 경우 필요하지 않음
                                    {
                                        FamilyInstance fitting = Doc.Create.NewElbowFitting(con1, con2);
                                    }
                                    else
                                    {
                                        continue;
                                    }
                                }
                                else
                                {
                                    FamilyInstance fitting = Doc.Create.NewElbowFitting(con1, con2);
                                }                                         
                            }
                            else if (Family_string.Contains("Tee") || Family_string.Contains("티"))
                            {
                                // 피팅의 좌표에서 가장 가까운 세 커넥터를 가져옴
                                (Connector con1, Connector con2, Connector con3, var con_4) = GetClosestConnectors(Element_Connector_Set, Curve_Location);
                                //연결 순서에 의해 피팅오류가 일어날 수 있음. 가능한 경우를 모두 적용
                                try
                                {
                                    FamilyInstance fitting = Doc.Create.NewTeeFitting(con1, con2, con3);
                                }
                                catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                                {
                                    try
                                    {
                                        FamilyInstance fitting = Doc.Create.NewTeeFitting(con3, con2, con1);
                                    }
                                    catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                                    {
                                        FamilyInstance fitting = Doc.Create.NewTeeFitting(con3, con1, con2);
                                    }
                                }
                            }
                            else if (Family_string.Contains("Cross") || Family_string.Contains("크로스") || Family_string.Contains("교차"))
                            {
                                // 피팅의 좌표에서 가장 가까운 네 커넥터를 가져옴
                                (Connector con1, Connector con2, Connector con3, Connector con4) = GetClosestConnectors(Element_Connector_Set, Curve_Location);
                                //연결 순서에 의해 피팅오류가 일어날 수 있음. 가능한 경우를 모두 적용
                                try
                                {
                                    FamilyInstance fitting = Doc.Create.NewCrossFitting(con1, con2, con3, con4);
                                }
                                catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                                {
                                    FamilyInstance fitting = Doc.Create.NewCrossFitting(con1, con3, con2, con4);
                                }
                            }
                            else
                            {
                                continue;
                            }
                        }
                        catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                        {
                            continue;
                            //TaskDialog.Show("Connecting Error", "Fittings are not connected and exist independently. Connection cannot be created.");
                        }
                        trans_main.Commit();
                    }
                }
            }
        }

        // 제이슨에서 키값을 얻는 함수
        public static List<string> GetAllKeys(JObject jsonObject)
        {
            List<string> keys = new List<string>();

            foreach (var pair in jsonObject)
            {
                keys.Add(pair.Key);
            }
            return keys;
        }

        //String으로 레벨 타입을얻는 함수
        public static Level GetLevelByName(Autodesk.Revit.DB.Document doc, string levelName)
        {
            FilteredElementCollector collector = new FilteredElementCollector(doc);
            collector.OfClass(typeof(Level));

            foreach (Level level in collector.Cast<Level>())
            {
                if (level.Name == levelName)
                {
                    return level;
                }
            }
            return null;
        }

        // 피팅 좌표로부터 가장 가까운 네 커넥터를 리턴하는 함수
        public static (Connector, Connector, Connector, Connector) GetClosestConnectors(List<Connector> connectors, XYZ point)
        {
            connectors.Sort((c1, c2) => c1.Origin.DistanceTo(point).CompareTo(c2.Origin.DistanceTo(point)));

            // 임계값 이하인 커넥터만 선택
            List<Connector> closestConnectors = new List<Connector>();
            foreach (var connector in connectors)
            {
                //if (connector.Origin.DistanceTo(point) <= 30)
                //{
                //    closestConnectors.Add(connector);
                //}
                closestConnectors.Add(connector);
            }

            // 가장 가까운 네 개의 커넥터를 선택
            Connector closestConnector = closestConnectors.Count > 0 ? closestConnectors[0] : null;
            Connector secondClosestConnector = closestConnectors.Count > 1 ? closestConnectors[1] : null;
            Connector thirdClosestConnector = closestConnectors.Count > 2 ? closestConnectors[2] : null;
            Connector fourthClosestConnector = closestConnectors.Count > 3 ? closestConnectors[3] : null;
            return (closestConnector, secondClosestConnector, thirdClosestConnector, fourthClosestConnector);
        }

    }
}