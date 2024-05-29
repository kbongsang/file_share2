using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Newtonsoft.Json;
using System.Threading.Tasks;
using SMAI;
using static SMAI.Sync;
using System.Windows.Markup;
using System.Windows.Controls;

namespace srai_addin
{
    class Sync_app
    {
        public ExternalCommandData revit;
        public string Dataset_name;

        public Sync_app(ExternalCommandData Revit, string dataset_name)
        {
            this.revit = Revit;
            Dataset_name = dataset_name;
        }

        public void Sync_run()
        {
            var doc = revit.Application.ActiveUIDocument.Document;
            var activeView = revit.Application.ActiveUIDocument.ActiveView;
            var collector = new FilteredElementCollector(doc, activeView.Id);
            var allElements = collector.ToElements();

            foreach (var element in allElements)
            {
                var options = new Options
                {
                    View = activeView
                };

                var geometries = element.get_Geometry(options);
                var allParameters = element.Parameters;
                var data = new Dictionary<string, object>();
                var triangles = new List<Triangle>();

                Get_mesh(geometries, triangles, element);

                Get_location(element, data);

                // 패밀리 내 패밀리 추출 코드
                if (element.Name == "Fam_in_Fam_Test") //대상이 되는 패밀리를 ||(OR) 조건으로 추가, 메쉬가 정확하게 겹쳐있어서 Client에서 시각적으로 구분이 되진 않음. Collision 계산을 위한 인스턴스들은 Is_genmodel_collision 파라미터가 true임.
                {
                    if (element is FamilyInstance fam && data["Location"] is Coordinate location)
                    {
                        Family family = fam.Symbol.Family;
                        Document fam_Doc = doc.EditFamily(family);

                        FilteredElementCollector coll = new FilteredElementCollector(fam_Doc);

                        var Family_coll = coll.OfClass(typeof(FamilyInstance)).ToElements();
                        var rotate = (fam.Location as LocationPoint).Rotation;
                        var bound_info = new Dictionary<string, object>();
                        foreach (var fam_element in Family_coll)
                        {
                            if (fam_element is FamilyInstance famInst_in_fam)
                            {
                                var bounding_box = fam_element.get_BoundingBox(null);
                                var b_min = bounding_box.Min;
                                var b_max = bounding_box.Max;
                                var bound_box_data = new Dictionary<string, Coordinate>
                                {
                                    ["min"] = new Coordinate() { X = b_min.X * 304.8, Y = b_min.Y * 304.8, Z = b_min.Z * 304.8 },
                                    ["max"] = new Coordinate() { X = b_max.X * 304.8, Y = b_max.Y * 304.8, Z = b_max.Z * 304.8 }
                                };
                                bound_info.Add(fam_element.UniqueId, bound_box_data);

                                var fam_options = new Options();

                                var fam_geometries = fam_element.get_Geometry(fam_options);
                                var fam_allParameters = fam_element.Parameters;
                                var fam_data = new Dictionary<string, object>();

                                var fam_triangles = new List<Triangle>();

                                Get_mesh(fam_geometries, fam_triangles, fam_element, location, 0);

                                Get_location(fam_element, fam_data, location);

                                Get_parameters(fam_allParameters, fam_Doc, fam_data);

                                if (fam_triangles.Count > 0)
                                {
                                    var fam_meshDto = new MeshDto() { Triangles = fam_triangles };
                                    fam_data.Add("Mesh", fam_meshDto);
                                }

                                fam_data.Add("Dataset_tag", Dataset_name); // 데이터 셋 구분을 위한 태그
                                fam_data.Add("Is_genmodel_collision", true);

                                var fam_dto = new ElementDto() { Id = fam_element.UniqueId, data = fam_data };

                                var fam_json = JsonConvert.SerializeObject(fam_dto, Formatting.Indented);
                                foreach (var socket in App.allSockets)
                                {
                                    //socket.Send(fam_json); //해당 코드를 주석처리 하면 패밀리 내부 패밀리에 대한 정보가 Clinet로 넘어가지 않음
                                }
                            }
                        }
                        data.Add("collision_bound", bound_info);
                    }
                }

                // ImportInstance 위치 및 메쉬 추출 코드
                if (element is ImportInstance imp_proj)
                {
                    var imp_proj_b = imp_proj.get_Geometry(options);
                    Get_mesh(imp_proj_b, triangles, element);
                }

                // 파이프 및 덕트 Connector 추출 코드
                if (element is MEPCurve mepCurve)
                {
                    var connecters = mepCurve.ConnectorManager.Connectors;
                    var connecterIds = new List<string>();

                    foreach (Connector connector in connecters)
                    {
                        var connectorRefs = connector.AllRefs;
                        foreach (Connector connectorRef in connectorRefs)
                        {
                            if (mepCurve.UniqueId != connectorRef.Owner.UniqueId)
                                connecterIds.Add(connectorRef.Owner.UniqueId);
                        }
                    }

                    data.Add("ConnectorIds", connecterIds);
                }

                // 장비 Connector 및 패밀리 내 Imortedinstace 메쉬  추출 코드
                if (element.Category != null && (element.Category.Name.Contains("Generic Models") || element.Category.Name.Contains("Mechanical Equipment")))
                {
                    var prop = element.GetType().GetProperty("MEPModel");
                    if (prop != null)
                    {
                        if (prop.GetValue(element) is MEPModel mepModel && mepModel.ConnectorManager != null)
                        {
                            var _vectors = new Dictionary<string, object>(); // 파이프 이름이랑 같이 받을 경우 사용
                            var con_diameters = new Dictionary<string, double>();
                            var connectorSet = mepModel.ConnectorManager.Connectors;

                            if (data["Location"] != null && data["Location"] is Coordinate location)
                            {
                                var connectorDescriptions = new Dictionary<string, int>(); // 

                                foreach (Connector connector in connectorSet)
                                {
                                    var locationAndDirection = new Dictionary<string, Coordinate>
                                    {
                                        ["location"] = new Coordinate() { X = connector.Origin.X * 304.8 - location.X, Y = connector.Origin.Y * 304.8 - location.Y, Z = connector.Origin.Z * 304.8 - location.Z },
                                        ["direction"] = new Coordinate() { X = connector.CoordinateSystem.BasisZ.X, Y = connector.CoordinateSystem.BasisZ.Y, Z = connector.CoordinateSystem.BasisZ.Z }
                                    };
                                    string key = connector.Description;


                                    if (!con_diameters.ContainsKey(key))
                                    {
                                        _vectors.Add(key, locationAndDirection);

                                        try
                                        {
                                            con_diameters.Add(key, connector.Radius * 2 * 304.8);
                                        }
                                        catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                                        {
                                            continue;
                                        }
                                    }
                                    else
                                    {
                                        // 이미 해당 Description을 가진 키가 있으면 숫자를 증가시켜서 고유한 키 생성
                                        if (!connectorDescriptions.ContainsKey(key))
                                        {
                                            connectorDescriptions.Add(key, 1);
                                        }
                                        else
                                        {
                                            connectorDescriptions[key]++;
                                        }

                                        string uniqueKey = $"{key}_{connectorDescriptions[key]}";

                                        _vectors.Add(uniqueKey, locationAndDirection);
                                        try
                                        {
                                            con_diameters.Add(uniqueKey, connector.Radius * 2 * 304.8);
                                        }
                                        catch (Autodesk.Revit.Exceptions.InvalidOperationException)
                                        {
                                            continue;
                                        }
                                    }
                                }
                            }
                            data.Add("Connectors", _vectors);
                            data.Add("Connectors_diameter", con_diameters); // 랜더링 쪽 이슈 발생, 이기세 PL 코드 Merge 시 해결 가능
                        }
                    }

                    if (element.Category.Name.Contains("Mechanical Equipment"))
                    {
                        if (element is FamilyInstance fam && data["Location"] is Coordinate location)
                        {
                            Family family = fam.Symbol.Family;
                            Document famDoc = doc.EditFamily(family);

                            FilteredElementCollector coll = new FilteredElementCollector(famDoc);

                            var fam_coll = coll.OfClass(typeof(ImportInstance)).ToElements();
                            var rotate = (fam.Location as LocationPoint).Rotation;

                            foreach (var instance_infam in fam_coll)
                            {
                                if (instance_infam is ImportInstance impInst)
                                {
                                    var geometries_infam = impInst.get_Geometry(options);

                                    Get_mesh(geometries_infam, triangles, instance_infam, location, rotate);
                                }
                            }
                        }
                    }
                }

                // 피팅 Connector 추출 코드
                if (element.Category != null && element.Category.Name.Contains("Fittings"))
                {

                    // For Fitting Rotation Test
                    var Instance = element as FamilyInstance;
                    Autodesk.Revit.DB.Transform ins = (element as Instance).GetTransform();
                    double angleX = ins.BasisX.AngleTo(XYZ.BasisX);
                    double angleInDegrees = angleX * 180 / Math.PI;
                    var b = Instance.GetTransform() as Autodesk.Revit.DB.Transform;
                    var d = (element.Location as LocationPoint).Rotation;
                    var c = (Instance.Location as LocationPoint).Rotation;
                    // For Fitting Rotation Test

                    // 패밀리 케이스 별로 커넥터 방향에 매칭 - 하드코드
                    if (element.Name == "case1") data.Add("Connector_Direction", new Coordinate() { X = 1, Y = 0, Z = 0 });
                    else if (element.Name == "case2" || element.Name == "Pipe Connect - Non_Connect") data.Add("Connector_Direction", new Coordinate() { X = 1, Y = 0, Z = 1 });
                    else if (element.Name == "case3") data.Add("Connector_Direction", new Coordinate() { X = -1, Y = 0, Z = 1 });
                    else if (element.Name == "case4") data.Add("Connector_Direction", new Coordinate() { X = -1, Y = 0, Z = 0 });
                    else if (element.Name == "case5") data.Add("Connector_Direction", new Coordinate() { X = 0, Y = 1, Z = 0 });
                    else if (element.Name == "case6") data.Add("Connector_Direction", new Coordinate() { X = 0, Y = 1, Z = 1 });
                    else if (element.Name == "case7") data.Add("Connector_Direction", new Coordinate() { X = 0, Y = -1, Z = 1 });
                    else if (element.Name == "case8") data.Add("Connector_Direction", new Coordinate() { X = 0, Y = -1, Z = 0 });
                    else data.Add("Connector_Direction", new Coordinate() { X = 0, Y = 0, Z = 1 });

                    var vectors = new List<Coordinate>();
                    if (Instance != null && Instance.MEPModel.ConnectorManager != null)
                    {
                        var test = Instance.MEPModel;
                        var connectorSet = Instance.MEPModel.ConnectorManager.Connectors;

                        if (data["Location"] != null && data["Location"] is Coordinate location)
                        {
                            foreach (Connector connector in connectorSet)
                            {
                                var coord = new Coordinate
                                {
                                    X = connector.Origin.X * 304.8 - location.X,
                                    Y = connector.Origin.Y * 304.8 - location.Y,
                                    Z = connector.Origin.Z * 304.8 - location.Z
                                };

                                vectors.Add(coord);

                                // 방향 자동 추출 - 커넥터가 모두 정의되어 있을 경우
                                // 커넥터가 모두 정의되어 있으며, 연결될 커넥터에는 Description의 값이 채워져 있어야 함.
                                //if (connector.Description != "")
                                //{
                                //    data.Add("Connector_Direction", new Coordinate() { X = connector.CoordinateSystem.BasisZ.X, Y = connector.CoordinateSystem.BasisZ.Y, Z = connector.CoordinateSystem.BasisZ.Z });
                                //}
                            }
                        }
                        data.Add("Connectors", vectors);
                    }
                }

                Get_parameters(allParameters, doc, data);

                if (triangles.Count > 0)
                {
                    var meshDto = new MeshDto() { Triangles = triangles };
                    data.Add("Mesh", meshDto);
                }

                data.Add("Dataset_tag", Dataset_name); // 데이터 셋 구분을 위한 태그
                data.Add("Is_genmodel_collision", false); // void 영역 추출 시 collision이 되는 부분과 구분하기 위핸 Flag

                var dto = new ElementDto() { Id = element.UniqueId, data = data };

                var json = JsonConvert.SerializeObject(dto, Formatting.Indented);
                foreach (var socket in App.allSockets)
                {
                    socket.Send(json);
                }
            }
        }

        public static void Get_location(Element element, Dictionary<string, object> data, Coordinate? location = null)
        {
            Coordinate _location = new Coordinate();
            if (location.HasValue)
            {
                _location = location.Value;
            }
            else
            {
                _location.X = 0;
                _location.Y = 0;
                _location.Z = 0;
            }

            if (element.Location != null && element.Location is LocationCurve curve)
            {
                var c = curve.Curve;


                if (element.Category.Name == "Flex Ducts")
                {
                    if (curve.Curve is HermiteSpline spline)
                    {
                        var vertices = new List<Coordinate>();
                        for (var i = 0; i < spline.ControlPoints.Count; i++)
                        {
                            vertices.Add(new Coordinate()
                            {
                                X = spline.ControlPoints[i].X,
                                Y = spline.ControlPoints[i].Y,
                                Z = spline.ControlPoints[i].Z
                            });
                        }
                        data.Add("Vertices", vertices);
                    }
                }
                else
                {
                    data.Add("Start Point", new Coordinate()
                    {
                        X = c.GetEndPoint(0).X * 304.8 + _location.X,
                        Y = c.GetEndPoint(0).Y * 304.8 + _location.Y,
                        Z = c.GetEndPoint(0).Z * 304.8 + _location.Z
                    });
                    data.Add("End Point", new Coordinate()
                    {
                        X = c.GetEndPoint(1).X * 304.8 + _location.X,
                        Y = c.GetEndPoint(1).Y * 304.8 + _location.Y,
                        Z = c.GetEndPoint(1).Z * 304.8 + _location.Z
                    });
                }
            }

            if (element.Location != null && element.Location is LocationPoint point)
            {
                data.Add("Location", new Coordinate()
                {
                    X = point.Point.X * 304.8 + _location.X,
                    Y = point.Point.Y * 304.8 + _location.X,
                    Z = point.Point.Z * 304.8 + _location.X
                });
            }
        }

        public static void Get_parameters(ParameterSet allParameters, Document doc, Dictionary<string, object> data)
        {
            foreach (Parameter param in allParameters)
            {
                object value;

                switch (param.StorageType)
                {
                    case StorageType.None:
                        value = null;
                        break;
                    case StorageType.Integer:
                        if (param.Definition.Name == "Horizontal Justification")
                        {
                            switch (param.AsInteger())
                            {
                                case 0:
                                    value = "Center";
                                    break;
                                case 1:
                                    value = "Left";
                                    break;
                                case 2:
                                    value = "Right";
                                    break;
                                default:
                                    value = param.AsInteger();
                                    break;
                            }
                            break;
                        }
                        if (param.Definition.Name == "Vertical Justification")
                        {
                            switch (param.AsInteger())
                            {
                                case 0:
                                    value = "Middle";
                                    break;
                                case 1:
                                    value = "Buttom";
                                    break;
                                case 2:
                                    value = "Top";
                                    break;
                                default:
                                    value = param.AsInteger();
                                    break;
                            }
                            break;
                        }
                        if (param.Definition.Name == "Flow State")
                        {
                            switch (param.AsInteger())
                            {
                                case -1:
                                    value = "MultiValues";
                                    break;
                                case 0:
                                    value = "LaminarState";
                                    break;
                                case 1:
                                    value = "TransitionState";
                                    break;
                                case 2:
                                    value = "TurbulentState";
                                    break;
                                default:
                                    value = param.AsInteger();
                                    break;
                            }
                            break;
                        }
                        value = param.AsInteger();
                        break;
                    case StorageType.Double:
                        // TODO: Upgrade needed.
                        //value = UnitFormatUtils.Format(doc.GetUnits(), param.Definition.UnitType, param.AsDouble(), true, true, new FormatValueOptions() { AppendUnitSymbol = true }); //2021

                        //2024
                        //value = UnitFormatUtils.Format(doc.GetUnits(), param.Definition.UnitType, param.AsDouble(), true, true, new FormatValueOptions() { AppendUnitSymbol = true });
                        // get ForgeTypeId of parameter

                        // use new Format method
                        // if mm use this
                        value = param.AsDouble() / 30480;

                        //if inch use this
                        //value = param.AsDouble() * 12;

                        break;
                    case StorageType.String:
                        value = param.AsString();
                        break;
                    case StorageType.ElementId:
                        var e = doc.GetElement(param.AsElementId());

                        if (param.Definition.Name == "Category")
                        {
                            try
                            {
                                if (param.AsElementId().Value == -1)
                                {
                                    value = null;
                                    break;
                                }

                                if (Category.GetCategory(doc, param.AsElementId()) == null)
                                {
                                    value = null;
                                    break;
                                }
                                else
                                {
                                    value = Category.GetCategory(doc, param.AsElementId()).Name;
                                }
                            }
                            catch (NullReferenceException ex)
                            {
                                value = ex.Message;
                            }

                            break;
                        }

                        if (param.Definition.Name == "Family")
                        {
                            var eType = doc.GetElement(param.AsElementId()) as ElementType;
                            value = eType.FamilyName;
                            break;
                        }

                        if (param.Definition.Name == "Family and Type")
                        {
                            var eType = doc.GetElement(param.AsElementId()) as ElementType;
                            value = eType.FamilyName + ": " + eType.Name;
                            break;
                        }

                        if (param.Definition.Name == "Type Id")
                        {
                            value = param.AsElementId().Value;
                            break;
                        }

                        if (e != null)
                        {
                            value = e.Name;
                            break;
                        }

                        value = null;
                        break;
                    default:
                        value = "Unsupported Type";
                        break;
                }

                if (data.Keys.Contains(param.Definition.Name))
                    continue;
                data.Add(param.Definition.Name, value);
            }
        }

        public static void Get_mesh(GeometryElement geometries, List<Triangle> triangles, Element element, Coordinate? location = null, double? rotate = null)
        {
            if (geometries != null)
            {
                foreach (var geom in geometries)
                {
                    if (geom is GeometryInstance geomInst)
                    {
                        var geomSymbol = geomInst.GetSymbolGeometry();
                        //Autodesk.Revit.DB.Transform transform = geomInst.Transform;
                        //XYZ origin = transform.Origin;
                        //var location = element.Location;

                        foreach (var geoObj in geomSymbol)
                        {
                            // 두 경우로 나누어 메쉬 추출 따로되게 만들기
                            var solid = geoObj as Solid;
                            // var test = geoObj as Mesh;
                            if (solid == null || solid.Faces.Size == 0 || solid.Edges.Size == 0)
                                continue;

                            var instTransform = geomInst.Transform;

                            foreach (Face face in solid.Faces)
                            {
                                var mesh = face.Triangulate();
                                object lockObj = new object(); // 동기화를 위한 lock 객체

                                Parallel.For(0, mesh.NumTriangles, j =>
                                {
                                    var tri = mesh.get_Triangle(j);
                                    for (var k = 0; k < 3; k++)
                                    {
                                        var pt = tri.get_Vertex(k);
                                        var transfromedPt = instTransform.OfPoint(pt);
                                        var factor = 3.048;
                                        var coord = new Coordinate();

                                        if (rotate.HasValue)
                                        {
                                            double _rotate = rotate.Value;
                                            Coordinate _location = location.Value;

                                            var X = transfromedPt.X * factor;
                                            var Y = transfromedPt.Y * factor;
                                            var trans_X = Math.Cos(_rotate) * X - Math.Sin(_rotate) * Y;
                                            var trans_Y = Math.Sin(_rotate) * X + Math.Cos(_rotate) * Y;
                                            coord.X = trans_X + (_location.X / 100);
                                            coord.Y = trans_Y + (_location.Y / 100);
                                            coord.Z = transfromedPt.Z * factor + (_location.Z / 100);
                                        }
                                        else
                                        {
                                            coord.X = transfromedPt.X * factor;
                                            coord.Y = transfromedPt.Y * factor;
                                            coord.Z = transfromedPt.Z * factor;
                                        }

                                        // 동기화된 접근을 위해 lock 사용
                                        lock (lockObj)
                                        {
                                            var triangle = new Triangle() { Index = j, Coordinate = coord };
                                            triangles.Add(triangle);
                                        }
                                    }
                                });
                            }
                        }
                    }
                    else if (geom is Solid solid)
                    {
                        // 메쉬가 필요 없는 항목들을 아래 조건에 추가
                        if (element.Category.Name == "Pipes" || element.Category.Name == "Ducts")
                        {
                            continue;
                        }
                        else
                        {
                            if (solid == null || solid.Faces.Size == 0 || solid.Edges.Size == 0) continue;
                            foreach (Face face in solid.Faces)
                            {
                                var mesh = face.Triangulate();
                                object lockObj = new object(); // 동기화를 위한 lock 객체

                                Parallel.For(0, mesh.NumTriangles, j =>
                                {
                                    var tri = mesh.get_Triangle(j);
                                    for (var k = 0; k < 3; k++)
                                    {
                                        var pt = tri.get_Vertex(k);
                                        var factor = 3.048;
                                        var coord = new Coordinate();

                                        if (rotate.HasValue)
                                        {
                                            double _rotate = rotate.Value;
                                            Coordinate _location = location.Value;

                                            var X = pt.X * factor;
                                            var Y = pt.Y * factor;
                                            var trans_X = Math.Cos(_rotate) * X - Math.Sin(_rotate) * Y;
                                            var trans_Y = Math.Sin(_rotate) * X + Math.Cos(_rotate) * Y;
                                            coord.X = trans_X + (_location.X / 100);
                                            coord.Y = trans_Y + (_location.Y / 100);
                                            coord.Z = pt.Z * factor + (_location.Z / 100);
                                        }
                                        else
                                        {
                                            coord.X = pt.X * factor;
                                            coord.Y = pt.Y * factor;
                                            coord.Z = pt.Z * factor;
                                        }

                                        // 동기화된 접근을 위해 lock 사용
                                        lock (lockObj)
                                        {
                                            var triangle = new Triangle() { Index = j, Coordinate = coord };
                                            triangles.Add(triangle);
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}